var http = require('http');
var azurestorage = require('azure-storage');
var plotly = require('plotly')(process.env["plotlyLogin"], process.env["plotlySecret"]);

module.exports = function (context, myQueueItem) {

    context.log(myQueueItem);
    processStorageFile(context, (fileData) => 
    {
        let fileJson = JSON.parse(fileData);   
        context.log('key = ', fileJson.Key);
        context.log('values count = ', fileJson.Values.length);

        let plotX = [];
        let plotY = [];

        loadDataToArrays(fileJson, myQueueItem.timeRange, plotX, plotY);

        let plotData = [{ x: plotX, y: plotY, type: 'bar' }];
        let layout = { fileopt: "overwrite", filename: myQueueItem.plotName };
        plotly.plot(plotData, layout, function (err, msg) {
            if (err) {
                return context.log(err);
            }

            context.log(msg);
            context.done(null, msg);
        });
    });
};

function processStorageFile(context, callback) {
    let fileSvc = azurestorage.createFileService(process.env["azureStorageName"],
        process.env["azureToken"]);

    let fileStream = fileSvc.createReadStream(process.env["shareName"],
        process.env["shareDir"],
        process.env["chartSourceFile"]);
    context.log("created ReadStream \\" + process.env["shareName"] + "\\" + process.env["shareDir"] + "\\" + process.env["chartSourceFile"]);
    let fileData = '';

    fileStream.on('data', function (chunk) {
        fileData += chunk;
    });

    fileStream.on('end', () => {
        context.log("reading stream ended");
        callback(fileData);
    });

};

function loadDataToArrays(jsonObj, timeRange, arrX, arrY) {

    let n = getTimeRangeInHours(timeRange);
    for (i = 1; i <= n; i++) {

        arrX.push(jsonObj.Values[n - i].Date);
        arrY.push(Number(jsonObj.Values[n - i].Value));
    }
};

function getTimeRangeInHours(timeRange) {
    let count = parseInt(process.env["defaultTimeRange"]);

    if (timeRange.endsWith('d')) {
        count = parseInt(timeRange.substr(0, timeRange.length - 1)) * 24;
    }
    else if (timeRange.endsWith('h')) {
        count = parseInt(timeRange.substr(0, timeRange.length - 1));
    }

    return count;
}


