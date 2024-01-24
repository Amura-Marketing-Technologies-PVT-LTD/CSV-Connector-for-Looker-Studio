var fieldMapping = {};

function getAuthType() {
    return { type: 'NONE' };
  }
  
  function getConfig(request) {
    return {
      configParams: [
        {
          type: 'TEXTINPUT',
          name: 'csvUrl',
          displayName: 'Enter the URL of your CSV file'
        }
      ]
    };
  }
  
function getSchema(request) {
    try {
    var csvUrl = request.configParams.csvUrl;
    var csvContent = UrlFetchApp.fetch(csvUrl).getContentText();
    var data = Utilities.parseCsv(csvContent);

    var headers = data[0]; // Assuming the first row contains headers
    var sampleData = data.slice(1, 5); // Get rows 2 to 5 for data type inference

    fieldMapping = {}; // Initialize the mapping

    var fields = headers.map(function(header, index) {
        var columnData = sampleData.map(function(row) { return row[index]; });
        var dataType = inferDataType(columnData);

        var safeName = 'col' + index;
        fieldMapping[safeName] = header; // Map the safe name to the actual CSV header

        return {
        name: safeName,
        label: header,
        dataType: dataType,
        semantics: {
            conceptType: dataType === 'NUMBER' ? 'METRIC' : 'DIMENSION'
        }
        };
    });

    console.log({ schema: fields });
    return { schema: fields };
    } catch (error) {
    console.log('Error in getSchema: ' + error);
    throw error;
    }
}
  
function getData(request) {
    try {
      var csvUrl = request.configParams.csvUrl;
      console.log('CSV URL in getData: ' + csvUrl);
      var csvContent = UrlFetchApp.fetch(csvUrl).getContentText();
      var data = Utilities.parseCsv(csvContent);
  
      var headers = data[0]; // Assuming the first row contains headers
      var schema = inferSchema(headers, data.slice(1, 5)); // Infer schema based on the data
      
      var requestedFieldNames = request.fields.map(field => field.name);
      var requestedSchema = schema.filter(field => requestedFieldNames.includes(field.name));
      console.log(requestedFieldNames,schema);
      //data.shift(); // Remove header
      
      var rows = data.slice(1).map(function(row) { // Skip header row
      var values = schema.map(function(field) {
        var fieldIndex = headers.indexOf(field.label); // Match schema field label with CSV header
        return fieldIndex !== -1 ? convertValue(row[fieldIndex], field.dataType) : null;
      });

      // Filter the values based on the requested fields
      var filteredValues = request.fields.map(function(requestField) {
        var schemaFieldIndex = schema.findIndex(function(schemaField) {
          return schemaField.name === requestField.name;
        });
        return schemaFieldIndex !== -1 ? values[schemaFieldIndex] : null;
      });

      return { values: filteredValues };
      });
      
      console.log(rows);
      console.log('=======SCHEMA======');
      /*var dummy_data = [
        {
          values: [ 38949, '20170716']
        },
        {
          values: [ 165314, '20170717']
        },
        {
          values: [ 180124, '20170718']
        },
      ];
      console.log(dummy_data);*/
      console.log({ schema: request.fields, rows: rows });
      return { schema: request.fields, rows: rows };

    } catch (error) {
      console.log('Error in getData: ' + error);
      throw error;
    }
  }
  
  function isAdminUser() {
    return false;
  }

function inferSchema(headers, sampleData) {
    return headers.map(function(header, index) {
        var columnData = sampleData.map(function(row) { return row[index]; });
        var dataType = inferDataType(columnData);

        return {
        name: 'col' + index,
        label: header,
        dataType: dataType
        };
    });
}
function inferDataType(columnData) {
    try {
        var nonEmptyData = columnData.filter(function(value) {
            return value.trim() !== '';
        });

        if (nonEmptyData.length === 0) {
            return 'STRING'; // Default to STRING if column is empty
        }

        var isNumber = nonEmptyData.every(function(value) {
            return !isNaN(value) && !isNaN(parseFloat(value));
        });

        var isDate = nonEmptyData.every(function(value) {
            return !isNaN(Date.parse(value));
        });

        if (isNumber) {
            return 'NUMBER';
        } else if (isDate) {
            return 'YEAR_MONTH_DAY_SECOND';
        } else {
            return 'STRING';
        }
    } catch (error) {
        console.log('Error in inferDataType: ' + error);
        return 'STRING'; // Default to STRING in case of an error
    }
}

function convertValue(value, dataType) {
  if (dataType === 'NUMBER') {
    return parseFloat(value);
  } else if (dataType === 'YEAR_MONTH_DAY_SECOND') {
    // Assuming the date is in a format parseable by JavaScript Date
    return new Date(value).toISOString();
  } else {
    return value; // Return as string for STRING dataType
  }
}
