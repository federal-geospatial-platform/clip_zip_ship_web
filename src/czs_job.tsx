import {
    CZS_EVENT_NAMES,
    PyGeoAPIJobStatusResponsePayload,
    PyGeoAPIJobResultResponsePayload
} from './czs_types';
import CZSUtils from './czs_utils';
import T_EN from '../locales/en/translation.json';
import T_FR from '../locales/fr/translation.json';
import CZSServices from './czs_services';
import ImageDownload from './assets/images/download.png';

interface CZSJobsProps {
    //handleStartDrawing: () => void;
}

type JobItem = {
    job_id: string;
    local_date_start: string;
    progress: number;
}

type JobResult = {
    job_id: string;
    extract_url: string;
}

/**
 * Create a container containing a leaflet map using the GeoView viewer
 *
 * @returns {JSX.Elemet} the element that creates the container and the map
 */
const CZSJobs = (props: CZSJobsProps): JSX.Element => {

    // Fetch the cgpv module
    const w = window as any;
    const cgpv = w['cgpv'];
    const { api, react, ui, useTranslation } = cgpv;
    const { createElement: h, useState, useEffect } = react;
    //const { makeStyles, useTheme } = ui;
    const { CircularProgress, ProgressBar } = ui.elements;
    const MAP_ID = "mapCZS";

    // Translation
    const { t, i18n } = useTranslation();

    // States
    const [jobs, _setJobs] = useState([] as JobItem[]);
    const [jobsCompleted, _setJobsCompleted] = useState([] as JobResult[]);
    const [jobsFailed, _setJobsFailed] = useState([]);
    const [jobsDismissed, _setJobsDismissed] = useState([]);

    useEffect(() => {
        // Add CZS translations file
        i18n.addResourceBundle("en", "translation", T_EN);
        i18n.addResourceBundle("fr", "translation", T_FR);

        // Listen to the engine load collections started event
        api.event.on(
            CZS_EVENT_NAMES.ENGINE_EXTRACT_STARTED,
            (payload: any) => {
                // If the job couldn't be queued
                let jobId = payload.job_id;
                if (!payload.job_id) {
                    jobId = self.crypto.randomUUID();
                }

                // Add the Job
                jobs.push({ job_id: jobId, local_date_start: time_format(new Date()), progress: 0 } as JobItem);

                // Update the Jobs
                _setJobs([...jobs]);

                // If the job could be queued
                if (payload.job_id) {
                    // Prep a checker thread to know when the job has terminated
                    startCheckingAsync(payload.job_id);
                }

                else {
                    // Server couldn't add the job
                    jobsDismissed.push(jobId);

                    // Update the dismissed Jobs
                    _setJobsDismissed([...jobsDismissed]);
                }
            },
            MAP_ID
        );

    }, []);

    function time_format(d: Date) {
        let hours = format_two_digits(d.getHours());
        let minutes = format_two_digits(d.getMinutes());
        let seconds = format_two_digits(d.getSeconds());
        return hours + ":" + minutes + ":" + seconds;
    }

    function format_two_digits(n: number) {
        return n < 10 ? '0' + n : n;
    }

    async function startCheckingAsync(job_id: string) {
        let done = false;
        try {
            while (!done) {
                // Query the job status
                let res: PyGeoAPIJobStatusResponsePayload = await CZSServices.getJobStatusAsync(job_id);

                // If the job status is terminated
                console.log("Job " + job_id, res);
                if (res.status == "successful") {
                    // Get the result
                    let resres: PyGeoAPIJobResultResponsePayload = await CZSServices.getJobResultAsync(job_id);

                    // Add the Job
                    jobsCompleted.push({ job_id: job_id, extract_url: resres.extract_url } as JobResult);

                    // Update the completed Jobs
                    _setJobsCompleted([...jobsCompleted]);

                    // Extract completed
                    api.utilities.showSuccess(MAP_ID, t('czs.success_extraction_completed'));
                    break; // Exit loop
                }

                else if (res.status == "failed") {
                    // Add the Job
                    jobsFailed.push(job_id);

                    // Update the completed Jobs
                    _setJobsFailed([...jobsFailed]);

                    // Show error
                    api.utilities.showError(MAP_ID, t('czs.success_extraction_failed'));
                    break; // Exit loop
                }

                else if (res.status == "accepted") {
                    // In progress
                    let searched_jobs: JobItem[] = jobs.filter((x: JobItem) => x.job_id == job_id);
                    if (searched_jobs.length > 0) {
                        let searched_job: JobItem = searched_jobs[0];
                        searched_job.progress = res.progress;
                        _setJobs([...jobs]);
                    }
                }

                // Wait before checking again..
                await CZSUtils.delay(2000);
            }
        }

        catch (err) {
            // Show error
            api.utilities.showError(MAP_ID, 'Failed to get job status');
        }
    }

    function renderJobs(jobs: JobItem[]) {
        return (<tbody>
            {Object.values(jobs).map((job: JobItem, idx: number) => {
                let jobCompleted: JobResult[] = jobsCompleted.filter((x: JobResult) => x.job_id == job.job_id);
                let jobFailed: string[] = jobsFailed.filter((x: string) => x == job.job_id);
                let jobDismissed: string[] = jobsDismissed.filter((x: string) => x == job.job_id);
                return (
                    <tr key={idx}>
                        <td className='czs-jobs-cell-info'>
                            {jobCompleted.length > 0 ? (
                                <a href={CZSUtils.getPygeoapiHost() + "/jobs/" + job.job_id} target="_blank">Extraction completed!</a>
                            ) : (
                                <div>
                                    {jobDismissed.length > 0 ? (
                                        <a className='job-dismissed'>Extraction queue is full!</a>
                                    ) : (
                                        <a href={CZSUtils.getPygeoapiHost() + "/jobs/" + job.job_id} target="_blank">Extraction started {job.local_date_start} ...</a>)
                                    }
                                </div>
                            )}
                        </td>
                        <td className='czs-jobs-cell-progress'>
                            {jobDismissed.length === 0 ? (
                                <div>
                                    {jobCompleted.length > 0 ? (
                                        <div></div>
                                    ) : (
                                        <div><ProgressBar variant='determinate' value={job.progress}></ProgressBar></div>
                                    )}
                                </div>
                            ) : (
                                <div></div>
                            )}
                        </td>
                        <td className='czs-jobs-cell-spin'>
                            {jobDismissed.length === 0 ? (
                                <div>
                                    <CircularProgress
                                        isLoaded={jobCompleted.length > 0 || jobFailed.length > 0}
                                        className='loading-spinner loading-job'
                                    ></CircularProgress>

                                    {jobCompleted.length > 0 ? (
                                        <div><a href={jobCompleted[0].extract_url} target="_blank"><img src={ ImageDownload }></img></a></div>
                                    ) : (
                                        <div></div>
                                    )}

                                    {jobFailed.length > 0 ? (
                                        <div><a href={CZSUtils.getPygeoapiHost() + "/jobs/" + job.job_id + "/results?f=json"} target="_blank">FAILED</a></div>
                                    ) : (
                                        <div></div>
                                    )}
                                </div>
                            ): (
                                <div></div>
                            )}
                        </td>
                    </tr>
                )
            })}
            </tbody>);
    }


    // Return Job UI
    return (
        <div className="czs-jobs">
            <table>
                { renderJobs(jobs) }
            </table>
        </div>
    );

};

export default CZSJobs;
