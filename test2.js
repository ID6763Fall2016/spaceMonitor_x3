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


var GPIO = require('onoff').Gpio,
        pir_pin = new GPIO(18, 'in', 'both');

function printState(err, state){
	var dt = new Date();
	console.log(dt.toLocaleDateString() + "  " + dt.toLocaleTimeString());
	console.log(state);
}
pir_pin.watch(printState);

