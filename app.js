var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');

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



function handler(req, res) {
	fs.readFile(__dirname + '/public/index-tingosocketchart.html',
		function(err, data){
			res.writeHead(200);
			res.end(data);
		});
	console.log("user connected");
}

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
			console.log(values);
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

setInterval(function(){
    // get vibration data from sensor
    var vibr = 0;
    if(!adc.busy){
        adc.readADCSingleEnded(channel, progGainAmp, samplesPerSecond, function(err, data) {
            vibr = data;
            // console.log(vibr);
        });  
    }
    // get temperature data from sensor
    var raw_data = i2c.readWordSync(0x40);
    var temp = (raw_data >> 2) * 0.03215;

    // get motion data from sensor
    var motion = pir_pin.readSync();
	var getDate = new Date();
	insertSample(temp, vibr, motion, getDate);
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

