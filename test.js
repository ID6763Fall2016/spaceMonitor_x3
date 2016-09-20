// button is attached to pin 17, LED to 18

// Vibration sensor
var ads1x15 = require('node-ads1x15');
var chip = 1;
var adc = new ads1x15(chip);
var raspi = require('raspi');
var I2C = require('raspi-i2c').I2C;
var i2c = new I2C();
raspi.init(function(){
//	var i2c= new I2C();
	console.log(i2c.readByteSync(0x40));
});

setInterval(function(){
	var raw_data = i2c.readWordSync(0x40);
	console.log("raw_data");
	console.log(raw_data);
	var temp = (raw_data >> 2 ) * 0.03125;
	
	console.log("DieTemp")
	console.log(temp);
}, 1000);



var channel = 0;
var samplesPerSecond = '250';
var progGainAmp = '4096';

var reading = 0;
setInterval(function(){
   if(!adc.busy){
	adc.readADCSingleEnded(channel, progGainAmp, samplesPerSecond, function(err, data) {
		console.log(data);
		});  
	}
	
}, 1000);


// var i2c = require('i2c');
// var address = 0x40;
// var wire = new i2c(address, {device:'/dev/i2c-1'});

// var GPIO = require('onoff').Gpio,
// 	led = new GPIO(12, 'out');
// 	vibration = new GPIO(6, 'in', 'both');


// define the callback function
function light(err, state){
	//check the state of the button
	console.log(state);
	// 1 == pressed, 0 == not pressed
	if(state == 1){
		led.writeSync(1);
		console.log("1");
	}
	else {
		led.writeSync(0);
		console.log("0");
	}

}
// button.watch(light);
