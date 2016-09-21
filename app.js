var express = require('express');
var app = express();
// var app = require('http').createServer(handler);
var server = require('http').Server(app);
var io = require('socket.io')(server);
// var fs = require('fs');
var path = require('path');

var Engine = require('tingodb')(),
assert = require('assert');

var db = new Engine.Db(__dirname + '/db', {});


// Initializing sensors
// Sensor 1: Temp 007 sensor
var raspi = require('raspi');
var I2C = require('raspi-i2c').I2C;
var i2c = new I2C();
raspi.init(function(){
    console.log("Raspberry Pi Initializing...");
});

// Sensor 2: vibration sensor
// ADC Data reading, analog to digital
var ads1x15 = require('node-ads1x15');
var chip = 1;
var adc = new ads1x15(chip);

var channel = 0;
var samplesPerSecond = '250';
var progGainAmp = '4096';

var reading = 0;

// Sensor 3: motion sensor from GPIO
var GPIO = require('onoff').Gpio,
        pir_pin = new GPIO(18, 'in', 'both');

app.get("/", function(req, res){
    res.sendfile(__dirname + '/public/index-tingosocketchart.html');
});

app.listen(8000);

io.on('connect', function(socket){
	console.log("user connected to socket");
	
	socket.on('messageFromClientToServer', function(data){
		console.log(data);
	});

	var sendLatestSamples = setInterval(function(){
		getLatestSamples(100, function(results){
			var values = []
			for(var i=0; i<results.length; i++)
			{
				values.push(results[i].value);
			}
			socket.emit('latestSamples', values);
			// console.log(values);
		});
	}, 1000);
	
	socket.on('disconnect', function(){
		console.log('user disconnected from socket');
		clearInterval(sendLatestSamples);
	});
});

var insertSample = function(temp, vibr, motion, theDate){
	var sampleCollection = db.collection('monitor');
	sampleCollection.insert({
		'temperature': temp,
        'vibration': vibr,
        'motion': motion,
		'datetime': theDate
	}, function(err, docResult){
		assert.equal(err, null);
		console.log("Inserted a sample into the monitor collection.")
	});
};

var TMP007_TDIE = 0x01;
var TMP007_TOBJ = 0x03;

setInterval(function(){
    // get vibration data from sensor
    adc.readADCSingleEnded(channel, progGainAmp, samplesPerSecond, function(err, data) {
        var vibr = data;
    
        // get temperature data from sensor
        var raw_data = i2c.readWordSync(0x40, TMP007_TDIE) & 0xFFFF;
        raw_data = ((raw_data << 8) & 0xFF00) + (raw_data >> 8)
        var temp = (raw_data >> 2) * 0.03215;

        var raw_obj_data = i2c.readWordSync(0x40, TMP007_TOBJ) & 0xFFFF;
        raw_obj_data = ((raw_obj_data << 8) & 0xFF00) + (raw_obj_data >> 8)
        var obj_temp = (raw_obj_data >> 2) * 0.03215;

        // get motion data from sensor
        var motion = pir_pin.readSync();
        var getDate = new Date();
        insertSample(obj_temp, vibr, motion, getDate);

    }); 
    
}, 1000);

var getLatestSamples = function(theCount, callback){
	var sampleCollection = db.collection('monitor');
	sampleCollection
		.find()
		.sort({'datetime': -1})
		.limit(theCount)
		.toArray(function(err,docList){
			callback(docList);
		});
};

