# Clip Zip Ship plugin for GeoView (development)
This is the main code for the Clip Zip Ship plugin for GeoView

### First clone this repo

```
git clone https://github.com/federal-geospatial-platform/clip_zip_ship_web.git
```

### Go to the directory of the cloned repo

```
cd clip_zip_ship_web
```

### Install dependencies

```
npm install
```

### Building the project

```
npm run build
```

### Run the project

```
npm run start
```

In development mode, when it's running, make sure to launch the GeoView Core in parallel on port 8081 so the plugin can interact with source code, in dev, from GeoView core at http://localhost:8081/cgpv-main.js


# GeoView & Clip Zip Ship plugin for GeoView (deployment)
Below are the steps to deploy both GeoView essentials and Clip Zip Ship plugin together in a single deployment package.

### First clone both repos

```
git clone https://github.com/federal-geospatial-platform/geoview_core.git
git clone https://github.com/federal-geospatial-platform/clip_zip_ship_web.git
```

### Go to the directory of the cloned GeoView repo

```
cd geoview_core
```

### Install dependencies

```
npm install -g @microsoft/rush
rush update
```

### Build the project

```
rush build:core
```

This will create a `dist` folder with the necessary files for the deployment.

### Go to the directory of the cloned GeoView repo

```
cd clip_zip_ship_web
```

### Build the project

```
npm run build
```

This will create a `dist` folder with the necessary files for the deployment.

### Combine both `dist` folders in the same deployment folder

```
robocopy C:\{PATH_OF_GIT_CLONE}\geoview_core\packages\geoview-core\dist  C:\{PATH_OF_DEPLOYMENT_FOLDER}  /MIR /DST /NP /NDL /R:5 /XA:S
robocopy C:\{PATH_OF_GIT_CLONE}\clip_zip_ship_web\dist                   C:\{PATH_OF_DEPLOYMENT_FOLDER}  /DST /NP /NDL /R:5 /XA:S
```

### Adjust the environment specific configurations

```
cd C:\{PATH_OF_DEPLOYMENT_FOLDER}
powershell -Command "(gc main.js) -replace 'http://localhost:5000', 'https://czs-pygeoapi.ddr-stage.services.geo.ca' | Out-File -encoding UTF8 main.js"
powershell -Command "(gc czs-config.js) -replace 'http://localhost:5000', 'https://czs-pygeoapi.ddr-stage.services.geo.ca' | Out-File -encoding UTF8 czs-config.js"
powershell -Command "(gc index.html) -replace 'http://localhost:8081/cgpv-main.js', 'cgpv-main.js' | Out-File -encoding UTF8 index.html"
powershell -Command "(gc index-fr.html) -replace 'http://localhost:8081/cgpv-main.js', 'cgpv-main.js' | Out-File -encoding UTF8 index-fr.html"
```

Use the `DocikerFile` to create the Docker container with the entire `C:\{PATH_OF_DEPLOYMENT_FOLDER}` which is expected to be named `dist` in the `DocikerFile`.
