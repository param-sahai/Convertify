const express = require("express");
const bodyParser = require("body-parser");
const { Parser } = require("json2csv");
const { toXML } = require("jstoxml");
const yaml = require("js-yaml");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { createCanvas, loadImage, registerFont } = require("canvas");
const axios = require("axios");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const cache = new Map();
const app = express();
const PORT = 5000;
const limit = 15;
const timeWindow = 15; //Minutes
const limiter = rateLimit({
  windowMs: timeWindow * 60 * 1000,
  limit: limit,
  message: `You have reached the max quota of ${limit} requests. Please wait for ${timeWindow} minutes!`,
});

app.use(cors()); // Use cors middleware
app.use(bodyParser.json());
app.use(limiter);

//Syntax Validation for json
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Check Json syntax and try again!" });
  }
  next();
});

app.post("/convert", async (req, res) => {
  const { data, format } = req.body;
  const cacheKey = `${data}-${format}`;

  if (cache.has(cacheKey)) {
    console.log("Using Cache for optimization");
    return res.send(cache.get(cacheKey));
  }

  let jsonData;
  try {
    if (typeof data === "string") {
      jsonData = JSON.parse(data);
    } else jsonData = JSON.parse(JSON.stringify(data));
  } catch (error) {
    return res.status(400).send("Invalid JSON data");
  }

  let result;
  let fileName;
  let contentType;
  switch (format) {
    case "csv":
      try {
        const parser = new Parser();
        result = parser.parse(jsonData);
        fileName = "data.csv";
        contentType = "text/csv";
      } catch (error) {
        return res.status(500).send("Error converting to CSV");
      }
      break;

    case "xml":
      try {
        result = toXML(jsonData, {
          indent: "    ",
        });
        fileName = "data.xml";
        contentType = "application/xml";
      } catch (error) {
        return res.status(500).send("Error converting to XML");
      }
      break;

    case "yaml":
      try {
        result = yaml.dump(jsonData);
        fileName = "data.yaml";
        contentType = "application/x-yaml";
      } catch (error) {
        return res.status(500).send("Error converting to YAML");
      }
      break;

    case "pdf":
      try {
        const doc = new PDFDocument();
        fileName = "data.pdf";
        contentType = "application/pdf";
        res.header("Content-Disposition", `attachment; filename=${fileName}`);
        res.header("Content-Type", contentType);
        doc.pipe(res);
        doc.text(JSON.stringify(jsonData, null, 2));
        doc.end();
        return;
      } catch (error) {
        return res.status(500).send("Error converting to PDF");
      }
      break;

    case "xlsx":
      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sheet 1");
        const keys = Object.keys(jsonData[0]);
        worksheet.columns = keys.map((key) => ({ header: key, key }));
        worksheet.addRows(jsonData);
        fileName = "data.xlsx";
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        res.header("Content-Disposition", `attachment; filename=${fileName}`);
        res.header("Content-Type", contentType);
        await workbook.xlsx.write(res);
        return;
      } catch (error) {
        return res.status(500).send("Error converting to Excel");
      }
    /**
     *
     *
     *
     *Under Process
     *
     *
     *
     *
     *
     *
     *
     *
     */
    case "png":
      try {
        // Create a canvas instance
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext("2d");

        // Example drawing: Render JSON data as text on the canvas
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#000000";
        ctx.font = "20px Arial";
        ctx.fillText(JSON.stringify(jsonData, null, 2), 50, 50);

        // Convert canvas to PNG buffer
        const buffer = canvas.toBuffer("image/png");

        // Send PNG buffer as response
        fileName = "data.png";
        contentType = "image/png";
        res.header("Content-Disposition", `attachment; filename=${fileName}`);
        res.header("Content-Type", contentType);
        res.send(buffer);
        return;
      } catch (error) {
        console.error("Error converting to PNG:", error);
        return res.status(500).send("Error converting to PNG");
      }
      break;

    default:
      return res.status(400).send({ error: "Invalid format" });
  }

  res.header("Content-Disposition", `attachment; filename=${fileName}`);
  res.header("Content-Type", contentType);
  cache.set(cacheKey, result);
  res.send(result);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
