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
      console.log("In String!");
    } else jsonData = JSON.parse(JSON.stringify(data));
  } catch (error) {
    return res.status(400).send("Invalid JSON data");
  }

  let result;
  switch (format) {
    case "csv":
      try {
        const parser = new Parser();
        result = parser.parse(jsonData);
        res.header("Content-Type", "text/csv");
        res.attachment("data.csv");
      } catch (error) {
        return res.status(500).send("Error converting to CSV");
      }
      break;

    case "xml":
      try {
        result = toXML(jsonData, {
          indent: "    ",
        });
        res.header("Content-Type", "application/xml");
        res.attachment("data.xml");
      } catch (error) {
        return res.status(500).send("Error converting to XML");
      }
      break;

    case "yaml":
      try {
        result = yaml.dump(jsonData);
        res.header("Content-Type", "application/x-yaml");
        res.attachment("data.yaml");
      } catch (error) {
        return res.status(500).send("Error converting to YAML");
      }
      break;

    case "pdf":
      try {
        const doc = new PDFDocument();
        res.header("Content-Type", "application/pdf");
        res.attachment("data.pdf");
        doc.pipe(res);
        doc.text(JSON.stringify(jsonData, null, 2));
        doc.end();
      } catch (error) {
        return res.status(500).send("Error converting to PDF");
      }
      return;

    case "xlsx":
      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sheet 1");
        const keys = Object.keys(jsonData[0]);
        worksheet.columns = keys.map((key) => ({ header: key, key }));
        worksheet.addRows(jsonData);
        res.header(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.attachment("data.xlsx");
        await workbook.xlsx.write(res);
      } catch (error) {
        return res.status(500).send("Error converting to Excel");
      }
      return;

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
        res.header("Content-Type", "image/png");
        res.attachment("data.png");
        res.send(buffer);
      } catch (error) {
        console.error("Error converting to PNG:", error);
        return res.status(500).send("Error converting to PNG");
      }
      break;

    default:
      return res.status(400).send("Invalid format");
  }

  cache.set(cacheKey, result);
  res.send(result);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
