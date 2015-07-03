'use strict';

var randomRow = function() {
    var row = {
        work: '',
        asks: (Math.random() * 100).toFixed(0),
        bids: (Math.random() * 100).toFixed(0),
        price: (Math.random() * 1000).toFixed(3),
        ltq: (Math.random() * 1000).toFixed(0)
    };
    return row;
};

var generateRandomData = function(rowCount) {
    var data = new Array(rowCount);
    for (var i = 0; i < rowCount; i++) {
        data[i] = randomRow();
    }
    return data;
};

module.exports = generateRandomData;