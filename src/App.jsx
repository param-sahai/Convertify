import React, { useState } from "react";
import {
  Container,
  TextField,
  Button,
  MenuItem,
  Typography,
} from "@mui/material";
import axios from "axios";
import FileDownload from "js-file-download";

const App = () => {
  const [jsonData, setJsonData] = useState("");
  const [format, setFormat] = useState("csv");

  const handleJsonDataChange = (event) => {
    setJsonData(event.target.value);
  };

  const handleFormatChange = (event) => {
    setFormat(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:5000/convert",
        {
          data: jsonData,
          format: format,
        },
        { responseType: "blob" }
      );

      FileDownload(response.data, `converted_data.${format}`);
    } catch (error) {
      if (error.response.status === 429) {
        alert("Too Many Requests. Please try again later");
      } else {
        alert("Invalid Json!");
        console.error("Error converting data:", error);
      }
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        JSON Data Converter
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="JSON Data"
          multiline
          rows={6}
          variant="outlined"
          fullWidth
          value={jsonData}
          onChange={handleJsonDataChange}
          margin="normal"
        />
        <TextField
          select
          label="Output Format"
          value={format}
          onChange={handleFormatChange}
          variant="outlined"
          fullWidth
          margin="normal"
        >
          <MenuItem value="csv">CSV</MenuItem>
          <MenuItem value="xml">XML</MenuItem>
          <MenuItem value="yaml">YAML</MenuItem>
          <MenuItem value="pdf">PDF</MenuItem>
          <MenuItem value="xlsx">Excel</MenuItem>
          <MenuItem value="png">PNG</MenuItem>
        </TextField>
        <Button variant="contained" color="primary" type="submit" fullWidth>
          Convert
        </Button>
      </form>
    </Container>
  );
};

export default App;
