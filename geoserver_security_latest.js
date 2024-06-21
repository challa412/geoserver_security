const express = require('express');
const app = express();
const axios = require('axios');
const port = process.env.PORT || 3000;
const xml2js = require('xml2js');

// middleware

app.use(express.json());

  // Endpoint to fetch capabilities dynamically
  
  app.get("/capabilities/:workspace/:layerName", async (req, res) => {
    const layerName = req.params.layerName;
    let workspace = req.params.workspace;
    const getCapabilitiesUrl = `http://geoserver.dev-springboard.digital.trccompanies.com/geoserver/${workspace}/wms?service=WMS&version=1.1.0&request=GetCapabilities`;
  
    try {
      // Fetch the capabilities document from GeoServer
      const response = await axios.get(getCapabilitiesUrl /* , { auth } */); // Uncomment if authentication is required
      const capabilitiesXml = response.data;
  
      // Parse the XML response
      xml2js.parseString(capabilitiesXml, (err, result) => {
        if (err) {
          console.error("Error parsing XML:", err);
          return res.status(500).send("Error parsing XML");
        }
  
        // Find the specific layer information
        const layers = result.WMT_MS_Capabilities.Capability[0].Layer[0].Layer;
        const layer = layers.find((l) => l.Name[0] === `${layerName}`);
  
        if (layer) {
          const title = layer.Title[0];
          const abstract = layer.Abstract ? layer.Abstract[0] : "No abstract";
          const bbox = layer.BoundingBox
            ? layer.BoundingBox[0].$
            : "No bounding box";
  
          res.json({
            layerName: `${workspace}:${layerName}`,
            title: title,
            abstract: abstract,
            boundingBox: bbox,
          });
        } else {
          res.status(404).send("Layer not found in the capabilities document.");
        }
      });
    } catch (error) {
      console.error("Error fetching capabilities:", error);
      res.status(500).send("Error fetching capabilities");
    }
  });


  app.get("/wmservice", async (req, res) => {
    const {
      SERVICE,
      VERSION,
      REQUEST,
      FORMAT,
      TRANSPARENT,
      QUERY_LAYERS,
      LAYERS,
      TILED,
      INFO_FORMAT,
      I,
      J,
      WIDTH,
      HEIGHT,
      CRS,
      STYLES,
      BBOX
    } = req.query;
    
    // Define WMS base URL
    const wmsBaseUrl = "http://geoserver.test-springboard.digital.trccompanies.com/geoserver";
    
    // Construct the WMS URL
    const wmsUrl = `${wmsBaseUrl}/wms`;
    
    const wmsParams = {
      SERVICE,
      VERSION,
      REQUEST,
      FORMAT,
      TRANSPARENT,
      QUERY_LAYERS,
      LAYERS,
      TILED,
      INFO_FORMAT,
      I,
      J,
      WIDTH,
      HEIGHT,
      CRS,
      STYLES,
      BBOX
    };
  
    try {
      // Make GET request to WMS service (using axios with params directly in URL)
      const response = await axios.get(wmsUrl, {
        params: wmsParams,
        responseType: "arraybuffer", // Ensure the response is treated as binary data
      });
    
      // Set the appropriate content type for the response
      res.setHeader("Content-Type", "image/png");
      // Send the binary data received from WMS server
      res.send(response.data);
    } catch (error) {
      // Handle errors
      console.error("Error fetching WMS data:", error);
      if (error.response) {
        // The request was made and the server responded with a status code
        res.status(error.response.status).send(`Error fetching WMS data: ${error.response.statusText}`);
      } else if (error.request) {
        // The request was made but no response was received
        res.status(500).send("Error fetching WMS data: No response received from server");
      } else {
        // Something happened in setting up the request that triggered an error
        res.status(500).send("Error fetching WMS data: Request setup error");
      }
    }
  });
  
  app.get("/graphic", async (req, res) => {
    const legendGraphicUrl = `http://geoserver.dev-springboard.digital.trccompanies.com/geoserver/wms`;
  
    const {
      REQUEST,
      VERSION,
      FORMAT,
      WIDTH,
      HEIGHT,
      LAYER
    } = req.query;
  
    const legendParams = {
      REQUEST,
      VERSION,
      FORMAT,
      WIDTH,
      HEIGHT,
      LAYER
    };
  
    try {
      const response = await axios.get(legendGraphicUrl, {
        responseType: "arraybuffer",
        params: legendParams,
        validateStatus: function (status) {
          return status < 500; // Resolve only if the status code is less than 500
        },
      });
  
      const contentType = response.headers["content-type"];
  
      if (contentType.includes("image/png")) {
        // Set appropriate headers
        res.set("Content-Type", "image/png");
  
        // Send the legend graphic as the response
        res.send(response.data);
      } else if (contentType.includes("application/vnd.ogc.se_xml")) {
        // Convert buffer to string
        const xmlString = response.data.toString("utf-8");
  
        // Parse XML
        xml2js.parseString(xmlString, (err, result) => {
          if (err) {
            console.error("Error parsing XML:", err);
            res.status(500).send("Error parsing server response");
          } else {
            const errorMessage =
              result?.ServiceExceptionReport?.ServiceException?.[0]?._;
            console.error("Error fetching legend graphic:", errorMessage);
            res.status(404).send(errorMessage || "Layer not found");
          }
        });
      } else {
        res.status(500).send("Unexpected response format");
      }
    } catch (error) {
      console.error("Error fetching legend graphic:", error);
      res.status(500).send("Error fetching legend graphic");
    }
  });

  app.get("/features", async (req, res) => {
    const {
      service,
      version,
      request,
      typeName,
      outputFormat,
      CQL_FILTER
    } = req.query;
  
    const wfsParams = {
      service,
      version,
      request,
      typeName,
      outputFormat,
      CQL_FILTER
    };
  
    try {
      const url = `http://geoserver.dev-springboard.digital.trccompanies.com/geoserver/wfs`;
      // Make a request to the WFS URL
      const response = await axios.get(url, { params: wfsParams });
  
      // Send the response received from the WFS server directly to the client
      res.json(response.data);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

app.listen(port , ()=>{
    console.log(`Server is running port ${port}`);
})