const express = require('express');
const bodyParser = require('body-parser');
const { Parser } = require('json2csv');
const { toXML } = require('jstoxml');
const yaml = require('js-yaml');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const cors = require('cors'); // Import cors

const app = express();
const PORT = 5000;

app.use(cors()); // Use cors middleware
app.use(bodyParser.json());

app.post('/convert', async (req, res) => {
  const { data, format } = req.body;

  let jsonData;
  try {
    jsonData = JSON.parse(data);
  } catch (error) {
    alert("Kindly check the JSON format and try again!")
    return res.status(400).send('Invalid JSON data');
  }

  let result;
  console.log('format:', format);
  switch (format) {
    case 'csv':
      try {
        const parser = new Parser();
        result = parser.parse(jsonData);
        res.header('Content-Type', 'text/csv');
        res.attachment('data.csv');
      } catch (error) {
        return res.status(500).send('Error converting to CSV');
      }
      break;

    case 'xml':
      try {
        result = toXML(jsonData, {
          indent: '    '
      });
        res.header('Content-Type', 'application/xml');
        res.attachment('data.xml');
      } catch (error) {
        return res.status(500).send('Error converting to XML');
      }
      break;

    case 'yaml':
      try {
        result = yaml.dump(jsonData);
        res.header('Content-Type', 'application/x-yaml');
        res.attachment('data.yaml');
      } catch (error) {
        return res.status(500).send('Error converting to YAML');
      }
      break;

    case 'pdf':
      try {
        const doc = new PDFDocument();
        res.header('Content-Type', 'application/pdf');
        res.attachment('data.pdf');
        doc.pipe(res);
        doc.text(JSON.stringify(jsonData, null, 2));
        doc.end();
      } catch (error) {
        return res.status(500).send('Error converting to PDF');
      }
      return;

    case 'xlsx':
      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet 1');
        const keys = Object.keys(jsonData[0]);
        worksheet.columns = keys.map(key => ({ header: key, key }));
        worksheet.addRows(jsonData);
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment('data.xlsx');
        await workbook.xlsx.write(res);
      } catch (error) {
        return res.status(500).send('Error converting to Excel');
      }
      return;

    default:
      return res.status(400).send('Invalid format');
  }

  res.send(result);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
