import App from './app';
import "./app.scss";

// Fetch the cgpv module
const w = window as any;
const { react, reactDOM } = w['cgpv'];

// Create the root for the application to reside into
const container = document.getElementById('root');
reactDOM.render(
	<react.StrictMode>
		<App />
	</react.StrictMode>, container
);
