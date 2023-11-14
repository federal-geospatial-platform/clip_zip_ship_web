/* eslint-disable react/no-array-index-key */
/* eslint-disable jsx-a11y/control-has-associated-label */
import { CZS_EVENT_NAMES, PyGeoAPIJobStatusResponsePayload, PyGeoAPIJobResultResponsePayload, SomePayloadBaseClass } from './czs-types';
import CZSUtils from './czs-utils';
import T_EN from '../locales/en/translation.json';
import T_FR from '../locales/fr/translation.json';
import CZSServices from './czs_services';
import { sxClasses } from './czs-style';
import ImageDownload from './assets/images/download.png';

type JobProps = {
  mapId: string;
};

type JobItem = {
  jobId: string;
  localDateStart: string;
  progress: number;
};

type JobResult = {
  jobId: string;
  extractUrl: string;
};

/**
 * Create a container containing a leaflet map using the GeoView viewer
 *
 * @returns {JSX.Elemet} the element that creates the container and the map
 */
function CZSJobs(props: JobProps): JSX.Element {
  // Fetch the cgpv module
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const { cgpv } = w;
  const { api, react, ui, useTranslation } = cgpv;
  const { useState, useEffect, useCallback } = react;
  const { Box, CircularProgress, ProgressBar } = ui.elements;
  const { mapId } = props;

  // Translation
  const { t, i18n } = useTranslation();

  // States
  const [jobs, _setJobs] = useState([] as JobItem[]);
  const [jobsCompleted, _setJobsCompleted] = useState([] as JobResult[]);
  const [jobsFailed, _setJobsFailed] = useState([]);
  const [jobsDismissed, _setJobsDismissed] = useState([]);

  function formatTwoDigits(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  const timeFormat = useCallback((d: Date): string => {
    const hours = formatTwoDigits(d.getHours());
    const minutes = formatTwoDigits(d.getMinutes());
    const seconds = formatTwoDigits(d.getSeconds());
    return `${hours}:${minutes}:${seconds}`;
  }, []);

  const startCheckingAsync = async (
    jobId: string,
    theJobs: JobItem[],
    theJobsCompleted: JobResult[],
    theJobsFailed: string[],
  ): Promise<void> => {
    const done = false;
    try {
      while (!done) {
        // Query the job status
        // eslint-disable-next-line no-await-in-loop
        const res: PyGeoAPIJobStatusResponsePayload = await CZSServices.getJobStatusAsync(jobId);

        // If the job status is terminated
        console.log(`Job ${jobId}`, res);
        if (res.status === 'successful') {
          // Get the result
          // eslint-disable-next-line no-await-in-loop
          const resres: PyGeoAPIJobResultResponsePayload = await CZSServices.getJobResultAsync(jobId);

          // Add the Job
          theJobsCompleted.push({ jobId, extractUrl: resres.extract_url } as JobResult);

          // Update the completed Jobs
          _setJobsCompleted([...theJobsCompleted]);

          // Extract completed
          api.utilities.showSuccess(mapId, t('czs.success_extraction_completed'));
          break; // Exit loop
        } else if (res.status === 'failed') {
          // Add the Job
          theJobsFailed.push(jobId);

          // Update the completed Jobs
          _setJobsFailed([...theJobsFailed]);

          // Show error
          api.utilities.showError(mapId, t('czs.success_extraction_failed'));
          break; // Exit loop
        } else if (res.status === 'accepted') {
          // In progress
          const searchedJobs: JobItem[] = theJobs.filter((x: JobItem) => x.jobId === jobId);
          if (searchedJobs.length > 0) {
            const searchedJob: JobItem = searchedJobs[0];
            searchedJob.progress = res.progress;
            _setJobs([...theJobs]);
          }
        }

        // Wait before checking again..
        // eslint-disable-next-line no-await-in-loop
        await CZSUtils.delay(2000);
      }
    } catch (err) {
      // Show error
      console.error(err);
      api.utilities.showError(mapId, 'Failed to get job status');
    }
  };

  useEffect(() => {
    console.log('IN USE EFFECT - JOB');
    // Listen to the engine load collections started event
    api.event.on(
      CZS_EVENT_NAMES.ENGINE_EXTRACT_STARTED,
      (payload: SomePayloadBaseClass) => {
        // If the job couldn't be queued
        let jobId = payload.job_id;
        if (!payload.job_id) {
          jobId = crypto.randomUUID();
        }

        // Add the Job
        jobs.push({ jobId, localDateStart: timeFormat(new Date()), progress: 0 } as JobItem);

        // Update the Jobs
        _setJobs([...jobs]);

        // If the job could be queued
        if (payload.job_id) {
          // Prep a checker thread to know when the job has terminated
          startCheckingAsync(payload.job_id, jobs, jobsCompleted, jobsFailed);
        } else {
          // Server couldn't add the job
          jobsDismissed.push(jobId);

          // Update the dismissed Jobs
          _setJobsDismissed([...jobsDismissed]);
        }
      },
      mapId,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // We only want to run the useEffect once to set the handler

  // Effect hook to be executed with i18n
  useEffect(() => {
    // Add GeoChart translations file
    i18n.addResourceBundle('en', 'translation', T_EN);
    i18n.addResourceBundle('fr', 'translation', T_FR);
  }, [i18n]);

  function renderJobs(theJobs: JobItem[]): JSX.Element {
    return (
      <tbody>
        {Object.values(theJobs).map((job: JobItem, idx: number) => {
          const jobCompleted: JobResult[] = jobsCompleted.filter((x: JobResult) => x.jobId === job.jobId);
          const jobFailed: string[] = jobsFailed.filter((x: string) => x === job.jobId);
          const jobDismissed: string[] = jobsDismissed.filter((x: string) => x === job.jobId);
          return (
            <tr key={idx}>
              <td className="czs-jobs-cell-info">
                {jobCompleted.length > 0 ? (
                  <a href={`${CZSUtils.getPygeoapiHost()}/jobs/${job.jobId}`} target="_blank" rel="noreferrer">
                    Extraction completed!
                  </a>
                ) : (
                  <Box>
                    {jobDismissed.length > 0 ? (
                      <span className="job-dismissed">Extraction queue is full!</span>
                    ) : (
                      <a href={`${CZSUtils.getPygeoapiHost()}/jobs/${job.jobId}`} target="_blank" rel="noreferrer">
                        Extraction started {job.localDateStart} ...
                      </a>
                    )}
                  </Box>
                )}
              </td>
              <td className="czs-jobs-cell-progress">
                {jobDismissed.length === 0 ? (
                  <Box>
                    {jobCompleted.length > 0 ? (
                      <Box />
                    ) : (
                      <Box>
                        <ProgressBar variant="determinate" value={job.progress} />
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box />
                )}
              </td>
              <td className="czs-jobs-cell-spin">
                {jobDismissed.length === 0 ? (
                  <Box>
                    <CircularProgress sx={sxClasses.loadingSpinnerJob} isLoaded={jobCompleted.length > 0 || jobFailed.length > 0} />

                    {jobCompleted.length > 0 ? (
                      <Box>
                        <a href={jobCompleted[0].extractUrl} target="_blank" rel="noreferrer">
                          <img src={ImageDownload} alt="" />
                        </a>
                      </Box>
                    ) : (
                      <Box />
                    )}

                    {jobFailed.length > 0 ? (
                      <Box>
                        <a href={`${CZSUtils.getPygeoapiHost()}/jobs/${job.jobId}/results?f=json`} target="_blank" rel="noreferrer">
                          FAILED
                        </a>
                      </Box>
                    ) : (
                      <Box />
                    )}
                  </Box>
                ) : (
                  <Box />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    );
  }

  // Return Job UI
  return (
    <Box sx={sxClasses.jobs}>
      <table>{renderJobs(jobs)}</table>
    </Box>
  );
}

export default CZSJobs;
