var localurl = "";
$(function(){
    $("body").on("click",".switch" ,function(){
        console.log("toggleing")
        $(this).toggleClass("on");
        if($(this).hasClass("on")){
            $(this).find(".swstatus").text("(ON)");
        }else{
            $(this).find(".swstatus").text("(OFF)");
        }
        var switchno = $(this).attr("switchno");
        var devicename = $(this).closest(".iotcontainer").attr("devid");

        //Switch tracks and ASK Device to update
        io.emit("admin",  "C2D#" + devicename + "@" + switchno + "=" + ($(this).hasClass("on")? 1 : 0));
        //websocket.send('toggle');

    });

    refreshDevices();
    
})


function refreshDevices(){
    $.get((localurl || "")+"/devices", function (data) {
        $("#iotwrapper").html("");
        //devices = [{dev: "E1", ip: "192.168.1.21", data: "D2C#E1@1=0#2=1#3=1#4=0#5=1#"}]
        devices = data;
        devices.forEach(d => {
            
            var switches = d.data.split("@")[1].split("#").filter(s => s.indexOf("=") > 0);
            var html = `<div id="iotwrapper" style="max-width:${switches.length*100}px">
            <div devid="${d.dev}" class="iotcontainer">
                <h2 class="devtitle">${d.title || d.dev}</h2>
                <div class="switches">
                ${
                    (() => {
                        return switches.map(s => {
                            var switchno = s.split("=")[0];
                            var swithon = s.split("=")[1] == "1";
                            return ` <div switchno="${switchno}" class="switch ${swithon? "on" : ""}"  style="width:${parseInt(100 / switches.length) - 2}% !important;"><span class="appliancename">${switchno}</span><span class='swstatus'>(${swithon? "ON" : "OFF"})</span></div>`;
                        }).join("");

                    })()
                }
                </div>
            </div>
        </div>`;
            $("#iotwrapper").append(html);
        })
    });
}

var io = io(localurl || window.location.origin);
io.on('connect', (socket) => {
    // io.emit("admin", "sfsfsfsggggg");
    // io.emit("admin",  "sdfsdfsf")
    console.log('user connected');
    io.on('disconnect', () => {
      console.log('user disconnected');
    });

    io.on("message", (data) => {
        console.log('message2: ' + data);
    });
    
    io.on('admin', (msg) => {
        //console.log('message: ' + msg);
        console.log(msg);
        if(msg.dev){
            updateDevices(msg);
        }
        //console.log("TODO2", msg.data);
        //TODO 2 : reflect the event on the contolr
      });
});


function updateDevices(d){
    
            var switches = d.data.split("@")[1].split("#").filter(s => s.indexOf("=") > 0);
            var $dev = $("[devid="+ d.dev + "]");
            if($dev.length == 0){ 
            var html = `<div id="iotwrapper" style="max-width:${switches.length*100}px">
            <div devid="${d.dev}" class="iotcontainer">
                <h2 class="devtitle">${d.title || d.dev}</h2>
                <div class="switches">
                ${
                    (() => {
                        return switches.map(s => {
                            var switchno = s.split("=")[0];
                            var swithon = s.split("=")[1] == "1";
                            return ` <div switchno="${switchno}" class="switch ${swithon? "on" : ""}"  style="width:${parseInt(100 / switches.length) - 2}% !important;"><span class="appliancename">${switchno}</span><span class='swstatus'>(${swithon? "ON" : "OFF"})</span></div>`;
                        }).join("");

                    })()
                }
                </div>
            </div>
        </div>`;
            $("#iotwrapper").append(html);
        }else{
            switches.forEach(s => {
                var switchno = s.split("=")[0];
                var $switch = $dev.find("[switchno=" + switchno +"]");
                var swithon = s.split("=")[1] == "1";
                var oldison = $switch.hasClass("on");
                if(swithon != oldison){
                    if(swithon){
                        $switch.addClass("on");
                        $switch.find(".swstatus").text("(ON)")
                    }else {
                        $switch.removeClass("on");
                        $switch.find(".swstatus").text("(OFF)")
                    }
                }
                return ` <div switchno="${switchno}" class="switch ${swithon? "on" : ""
                    }"  style="width:${parseInt(100 / switches.length) - 2}% !important;"><span class="appliancename">
                    ${switchno}</span><span class='swstatus'>(${swithon? "ON" : "OFF"})</span></div>`;
            })

        }
}




/***********/
var devconfig = [
    { 
        devid : "E1", 
        utterances : ["hall"], 
        switches : [ 
             { no : 1 , textid :["left light", "main light"], action : { on : ["on"], off : ["off"]} },
             { no : 1 , textid :["right light", "main light"], action : { on : ["on"], off : ["off"]} },
             { no : 1 , textid :["dim light","lamp"], action : { on : ["on"], off : ["off"]} },
             { no : 1 , textid :["fan"], action : { on : ["on"], off : ["off"]} },
            ],
    }
]




function decipherVoiceCommand(msg) {
    var devices = [];
    for(let i = 0; i< devconfig.length; i++){
        var d = devconfig[i];
        let isdevice = false;
        for(let u = 0; u < d.utterances.length; u++ ){
            if(!d.utterances[i])continue;
            isdevice = msg.toLowerCase().indexOf(d.utterances[u].toLowerCase()) > -1;
            if(isdevice)break;
        }
        if(!isdevice)continue;

        var device = { devid : d.devid };

        device.switches = [];        
        for(let u = 0; u < d.switches.length; u++ ){
			var $switch = d.switches[u];
			
			let isswitch = false;
            var switchtext = $switch.textid;
			for(let s =0; s<switchtext.length; s++){                
                 isswitch = msg.toLowerCase().indexOf(switchtext[s].toLowerCase()) > -1;
				 if(isswitch)break;
            }    
			if(!isswitch)continue;
			
			var newstate = -1;
            var actions = $switch.action;
            var words = msg.toLowerCase().split(/ /g);
            if(newstate == -1 &&  actions.on){
                for(let s = 0; s<actions.on.length; s++){                        
                     if(words.indexOf(actions.on[s].toLowerCase()) > -1){
                        newstate = 1;break;
                     }                     
                }    
            }
            if(newstate == -1 && actions.off){
                for(let s = 0; s<actions.off.length; s++){                        
                     if(words.indexOf(actions.off[s].toLowerCase()) > -1){
                        newstate = 0;break;
                     }                     
                }    
            }
			
			
			if(newstate > -1)device.switches.push({no:$switch.no, action : newstate });
        }
		
		devices.push(device);

        
    }
   return devices;
}


var recognition = new webkitSpeechRecognition();
recognition.onresult = function(event) { 
  console.log(event) 
    var voicemsg = event.results[0];
  //var tmpdevices = decipherVoiceCommand( "turn off hall room left light");
    var tmpdevices = decipherVoiceCommand( voicemsg || "turn on fan");
    if(tmpdevices.length == 0)console.log("Could not bind to device")
    tmpdevices.forEach(d => {
        //var tmpd = devices.filter(x => x.devid = d.devid);
        d.switches.forEach(s => {
            currentState = $("[devid=" + d.devid + "] .switches [switchno=" + s.no + "] .swstatus").text();
            var updatestate = -1;
            debugger;
            if(currentState.toLowerCase().indexOf("off") > 0 && s.action == 1){
                updatestate = 1;
            }else if(currentState.toLowerCase().indexOf("on") > 0 && s.action == 0){
                updatestate = 0
            }

            if(updatestate > -1){
                var sendmsg = "C2D#" + d.devid + "@" + s.no + "=" + updatestate;
                console.log("C2D#" + d.devid + "@" + s.no + "=" + updatestate);
                io.emit("admin",  sendmsg);
            }

        });
        
        //console.log(d)
    })
}
console.log("testing");

function speak(){
    recognition.start();
}




/**********/