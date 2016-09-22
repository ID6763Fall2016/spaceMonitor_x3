var express = require('express');
var app = express();

app.use("/fonts", express.static(__dirname + '/fonts'));
app.use("/css", express.static(__dirname + '/css'));
app.use("/js", express.static(__dirname + '/js'));
app.use("/font-awesome", express.static(__dirname + '/font-awesome'));
app.use("/images", express.static(__dirname + '/images'));
app.use("/node_modules/socket.io/node_modules/socket.io-client",
        express.static(__dirname + '/socket.io'));

var server = require('http').Server(app);
var io = require('socket.io')(server);

/*
* Database initialization
*/
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
    res.sendFile(__dirname + '/index.html');
});


server.listen(3000);

var VIBR_THRESHOD = 600;


var sampleCollection = db.collection('monitor');
io.on('connect', function(socket){
	console.log("user connected to socket");
	
	socket.on('messageFromClientToServer', function(data){
		// console.log(data);
	});

    var sendRealTimeData = setInterval(function(){
        // the latest real time data
        getLatestSamples(1, function(result){
            if(result){
                console.log(result);
                var temp = result[0].temperature.toFixed(1);
                var vibr = result[0].vibration;
                var machineStatus = 0;
                if (vibr > 600)
                    machineStatus = 1;

                socket.emit('realData', [temp, machineStatus]);
            }
        });

        // Process & emit temperature data to client
        // every data point will be shown on the client sside
        getLatestSamples(100, function(results){
            var temps = [];
            var machineStatus = [];
            for(var i=0; i<results.length; i++)
            {
                temps.push(results[i].temperature);
                var status = 0;
                if(results[i].vibration > VIBR_THRESHOD)
                {
                    status = 1
                }
                machineStatus.push(status);
            }

            for (var i=1; i< machineStatus.length - 1; i++)
            {
                if (machineStatus[i] != machineStatus[i-1] && machineStatus[i-1] == machineStatus[i+1])
                {    
                    machineStatus[i] = machineStatus[i-1];
                }

            }

            socket.emit('latestSamples', temps);
            socket.emit("machineStatus", machineStatus);
        });


    }, 1000);


    var now = new Date();
    var sampleNumber = now.getHours() * 3600 + now.getMinutes() * 60;
    var date = now.getDate();
    var hour = now.getHours();

    // Process motion data
    // 1/0 Flag switch if deteced motion
    // People around of the day
    // Frequency: 10 mins (1000 * 60 * 10)
    // var sendAccumulatedPeopleSamples = setInterval(function(){

    //     var ppDensity = new Array(24+1).join('0').split('').map(parseFloat);

    //     // One hours as one unit
    //     for (var i = 0; i < 24; i++)
    //     {
    //         var motionNum = 0;
    //         sampleCollection
    //             .find({'date': date}, {'hour': String(i)})
    //             .sort({'datetime': -1})
    //             .toArray(function(err, results){
    //                 if(results){
    //                     for (var j = 1; j < results.length; j++){
    //                         if(results[j].motion != results[j-1].motion)
    //                         {
    //                             motionNum += 1;
    //                         }
    //                     }
    //                 }
    //             });
    //         ppDensity[i] = motionNum;
    //     }

    //     socket.emit('ppDensity', ppDensity);

    // }, 1000);

	
	socket.on('disconnect', function(){
		console.log('user disconnected from socket');
		clearInterval(sendLatestSamples);
	});
});

var insertSample = function(temp, vibr, motion, theDate){
	var sampleCollection = db.collection('monitor');

    // get time information
    var month = theDate.getMonth() + 1; // start from 0
    var date = theDate.getDate();
    var hour = theDate.getHours();
    var minutes = theDate.getMinutes();

	sampleCollection.insert({
		'temperature': temp,
        'vibration': vibr,
        'motion': motion,
        'month': month,
        'date': date,
        'hour': hour,
        'minutes': minutes,
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
    var vibr;
    adc.readADCSingleEnded(channel, progGainAmp, samplesPerSecond, function(err, data) {
        vibr = data;

    }); 

    // get temperature data from sensor
    var raw_data = i2c.readWordSync(0x40, TMP007_TDIE) & 0xFFFF;
    raw_data = ((raw_data << 8) & 0xFF00) + (raw_data >> 8)
    var temp = (raw_data >> 2) * 0.03215;

    var raw_obj_data = i2c.readWordSync(0x40, TMP007_TOBJ) & 0xFFFF;
    raw_obj_data = ((raw_obj_data << 8) & 0xFF00) + (raw_obj_data >> 8)
    var obj_temp = ((raw_obj_data >> 2) * 0.03215).toFixed(1);

    // get motion data from sensor
    var motion = pir_pin.readSync();
    var getDate = new Date();
    // insertSample(obj_temp, vibr, motion, getDate);
    
    // Randon data
    // var obj_temp = Math.random() * 100;
    // var vibr = Math.random() * 1000;
    // var motion = Math.round(Math.random());
    // var getDate = new Date();



    insertSample(temp, vibr, motion, getDate);

}, 1000);

var getLatestSamples = function(theCount, callback){
	var sampleCollection = db.collection('monitor');
	sampleCollection
		.find()
		.sort({'datetime': -1})
		.limit(theCount)
		.toArray(function(err, docList){
			callback(docList);
		});
};

