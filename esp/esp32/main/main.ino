// Import required libraries
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include "myconfig.h"

// Replace with your network credentials
const char* ssid = WID;
const char* password = WPD;
String serverip = "";
int dorequest = 0;
bool ledState = 0;


//ESP01
//const int pincount = 1;
//int pinout[pincount] = {2}; 
//const int ledPin = 2;
//ESP8266
const int ledPin = 16;
const int pincount = 4;
int pinout[pincount] = {16,5,4,2}; 
float pin[pincount];

String devicename = "E1";
String readPins();
bool updatepins(String s);

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

void notifyClients() {
  //ws.textAll(String(ledState));
  ws.textAll(readPins());
}

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    data[len] = 0;
    String s = String((char*)data);
    Serial.println("Recieved " + s);
    if( s.startsWith("DRD")){
      notifyClients();      
    }else if( s.startsWith("C2D")){
      updatepins(s);   
      notifyClients();
    }else if (strcmp((char*)data, "toggle") == 0) {
      ledState = !ledState;
      notifyClients();
    }
  }
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
             void *arg, uint8_t *data, size_t len) {
    switch (type) {
      case WS_EVT_CONNECT:
        Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
        break;
      case WS_EVT_DISCONNECT:
        Serial.printf("WebSocket client #%u disconnected\n", client->id());
        break;
      case WS_EVT_DATA:
        handleWebSocketMessage(arg, data, len);
        break;
      case WS_EVT_PONG:
      case WS_EVT_ERROR:
        break;
  }
}

void initWebSocket() {
  ws.onEvent(onEvent);
  server.addHandler(&ws);
}

String processor(const String& var){
  Serial.println(var);
  if(var == "STATE"){
    if (ledState){
      return "ON";
    }
    else{
      return "OFF";
    }
  }
}

void setup(){
  // Serial port for debugging purposes
  Serial.begin(115200);
  delay(10);
  Serial.println('\n');
  Serial.println("Starting app...");
  //pinMode(ledPin, OUTPUT);
   for (int i = 0;  i < pincount; i++) {
        pinMode(pinout[i], OUTPUT);
        digitalWrite(pinout[i], LOW);
    }
  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to ");
  Serial.print(ssid); Serial.println(" ...");

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
   //Serial.print(++i); 
   Serial.print('.');
  }

 Serial.print("Connection Established");
  // Print ESP Local IP Address
  Serial.println(WiFi.localIP());

  initWebSocket();  
  sendFirstHello();

  // Route for root / web page
  server.on("/sendfirsthello", HTTP_GET, [](AsyncWebServerRequest *request){
    Serial.println(request->url());

    //List all parameters
    int params = request->params();
    for(int i=0;i<params;i++){
      AsyncWebParameter* p = request->getParam(i);      
      if(p->name().equals("ip"))serverip = p->value();
    }
    //delay(2000);
    //sendFirstHello();  
    dorequest = 1;
  });

  // Start server
  server.begin();
}

void loop() {
  ws.cleanupClients();
  //digitalWrite(ledPin, ledState);
  delay(2000);
  if(dorequest == 1){
    dorequest = 0;
    sendFirstHello();  
  }
  delay(2000);
}


String readPins() {
    String s = "";

    for (int i = 0;  i < pincount; i++) {
        int level = digitalRead(pinout[i]);
        s += String(i + 1) + "=" + String(level) + "#";//TODO : Read og pin config
        pin[i] = level;
        //s += String(i + 1) + "=" + String((int)pin[i]) + "#";//TODO : Read og pin config
    }
    
    Serial.print("D2C#" + devicename + "@" + s);
    return  "D2C#" + devicename + "@" + s;
}

bool updatepins(String s) {
    String receiveddevicename = "";    
    String pinno = "", pinvalue = "";
    bool ispinvalreading = false;
    
    if (s[0] =='D' && s[2] == 'C') {//D2C / D2D / C2D: cloud2device / DRD - Ask device to trasmit pin signals 
        //cout << "Device has sent to cloud (ignore this message)\n";
        printf("Device has sent to cloud (ignore this message)\n");
        return true;
    }
    bool updatedpins = false;
    int i = 3;
    while (++i < s.length() && s[i] != '@')  receiveddevicename += s[i];
    ++i;
    for (; i < s.length(); i++) {
        if (!ispinvalreading) {
            if (s[i] == '=') { ispinvalreading = true; continue; }
            pinno += s[i];
        }
        else {
            if (s[i] == '#') {
                if (pin[(pinno.toInt()) -1] != (pinvalue).toFloat()) {
                    //cout <<'\n' << "Updating Pin" << ((pinno).toInt() -1 ) << " to " << pinvalue;//TODO : Set og pin config
                    //printf( "Updating Pin" + String((pinno).toInt() -1 ) + " to " +  pinvalue);
                    //printf( "Updating Pin to %s ",  pinvalue.c_str());
                      Serial.println("Updating Pin %s (%s) to %s " + String((pinno).toInt() -1 )  + String((pinno.toInt()) -1) +  pinvalue.c_str());
                      //pin[(pinno.toInt()) -1] = (pinvalue).toInt();
                    digitalWrite(pinout[(pinno.toInt()) -1], (pinvalue).toInt());
                    updatedpins = true;
                }
                pinno = "", pinvalue = "", ispinvalreading = false;
            }else 
            pinvalue += s[i];
        }
    }
    if(updatedpins){
      Serial.println("Sending update to cloud");
      notifyClients();
    }
    return true;
}

HTTPClient http;
void sendFirstHello(){
      String serverName = serverip;
      Serial.println("Sending hello");
      // Your Domain name with URL path or IP address with path
      http.begin(serverName);
      
      // If you need an HTTP request with a content type: application/json, use the following:
      http.addHeader("Content-Type", "application/json");
      String ipstr = (WiFi.localIP()).toString().c_str();
      String s = "{\"dev\":\"" + devicename  +"\",\"ip\":\"" + ipstr + "\"}";
      Serial.println("Posting to " + String(serverName) + " , data : " + s);
      int httpResponseCode = http.POST(s);
     
      
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
        
      // Free resources
      http.end();
  
}
