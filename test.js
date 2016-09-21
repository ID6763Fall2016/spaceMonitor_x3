// Sensor 1: Temp 007 sensor
var raspi = require('raspi');
var I2C = require('raspi-i2c').I2C;
var i2c = new I2C();
raspi.init(function(){
//	var i2c= new I2C();
	console.log(i2c.readByteSync(0x40));
});

setInterval(function(){
	var raw_data = i2c.readWordSync(0x40);
	console.log("------ Temp -------");
	console.log("raw_data");
	console.log(raw_data);
	var temp = (raw_data >> 2 ) * 0.03125;
	
	console.log("DieTemp")
	console.log(temp);
}, 1000);


// Sensor 2: vibration sensor
// ADC Data reading, analog to digital
var ads1x15 = require('node-ads1x15');
var chip = 1;
var adc = new ads1x15(chip);

var channel = 0;
var samplesPerSecond = '250';
var progGainAmp = '4096';

var reading = 0;
setInterval(function(){
   if(!adc.busy){
	adc.readADCSingleEnded(channel, progGainAmp, samplesPerSecond, function(err, data) {
		console.log("------ Vibration -------");
		console.log(data);
		});  
	}
	
}, 1000);


// Sensor 3: motion sensor from GPIO
var GPIO = require('onoff').Gpio,
        pir_pin = new GPIO(18, 'in', 'both');

function printState(err, state){
	var dt = new Date();
	console.log("------ motion sensor -------");
	console.log(dt.toLocaleDateString() + "  " + dt.toLocaleTimeString());
	console.log(state);
}
pir_pin.watch(printState);

