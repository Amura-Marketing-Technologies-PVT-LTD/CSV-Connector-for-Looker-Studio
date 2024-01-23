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
  var csvUrl = request.configParams.csvUrl;
  var csvContent = UrlFetchApp.fetch(csvUrl).getContentText();
  var data = Utilities.parseCsv(csvContent);
  
  var headers = data[0];
  var sampleData = data.slice(1, 5); // Get rows 2 to 5 for data type inference

  var fields = headers.map(function(header, index) {
    var columnData = sampleData.map(function(row) { return row[index]; });
    var dataType = inferDataType(columnData);
    return {
      name: 'col' + index,
      label: header,
      dataType: dataType,
      semantics: {
        conceptType: dataType === 'NUMBER' ? 'METRIC' : 'DIMENSION'
      }
    };
  });

  return { schema: fields };
}

function getData(request) {
  var csvUrl = request.configParams.csvUrl;
  var csvContent = UrlFetchApp.fetch(csvUrl).getContentText();
  var data = Utilities.parseCsv(csvContent);

  var headers = data[0];
  data.shift(); // Remove header

  var rows = data.map(function(row) {
    var values = request.fields.map(function(field) {
      var fieldIndex = headers.indexOf(field.label);
      return row[fieldIndex];
    });
    return { values: values };
  });

  return { schema: request.fields, rows: rows };
}

function isAdminUser() {
  return false;
}

function inferDataType(columnData) {
  var isNumber = columnData.every(function(value) {
    return !isNaN(value) && value.trim() !== '';
  });
  var isDate = columnData.every(function(value) {
    return !isNaN(Date.parse(value));
  });

  if (isNumber) {
    return 'NUMBER';
  } else if (isDate) {
    return 'YEAR_MONTH_DAY_SECOND';
  } else {
    return 'STRING';
  }
}
