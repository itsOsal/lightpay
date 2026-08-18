import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Cpu, Copy, Check, Terminal, Wifi, Radio, Code2 } from 'lucide-react';

interface IotHardwareDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isLightOn: boolean;
}

export const IotHardwareDrawer: React.FC<IotHardwareDrawerProps> = ({
  isOpen,
  onClose,
  isLightOn,
}) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ESP32' | 'CURL' | 'HOME_ASSISTANT'>('ESP32');

  const esp32Code = `// ESP32 / ESP8266 Arduino Sketch for Light IoT Smart Relay
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "https://your-light-app.com/api/iot/relay";

const int RELAY_PIN = 18; // GPIO Pin connected to AC/DC Relay

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    int httpCode = http.GET();

    if (httpCode == 200) {
      String payload = http.getString();
      StaticJsonDocument<256> doc;
      deserializeJson(doc, payload);

      int relayState = doc["relay"]; // 1 for ON, 0 for OFF
      digitalWrite(RELAY_PIN, relayState == 1 ? HIGH : LOW);
      Serial.printf("Smart Light Relay: %s\\n", relayState == 1 ? "ON" : "OFF");
    }
    http.end();
  }
  delay(1000); // Poll every second
}`;

  const curlCode = `# 1. Check Light Status (IoT Device Polling)
curl -X GET https://your-light-app.com/api/iot/relay

# 2. Turn Light ON (Free)
curl -X POST https://your-light-app.com/api/light/on

# 3. Create ₹1 Turn-off Order
curl -X POST https://your-light-app.com/api/payment/create

# 4. Turn Light OFF (Requires verified token)
curl -X POST https://your-light-app.com/api/light/off \\
  -H "Content-Type: application/json" \\
  -H "x-unlock-token: LP_SEC_YOUR_VERIFIED_TOKEN"`;

  const haYaml = `# Home Assistant configuration.yaml
switch:
  - platform: rest
    name: "Light Smart Lamp"
    resource: "https://your-light-app.com/api/iot/relay"
    is_on_template: "{{ value_json.relay == 1 }}"
    headers:
      Content-Type: application/json`;

  const copySnippet = (text: string, tab: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">IoT Hardware Bridge</h3>
              <p className="text-xs text-slate-400">
                Connect physical ESP32, Arduino, or smart home relays
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Live Device Status */}
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-900 text-cyan-400">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-300">Live Hardware Relay Output</div>
                <div className="text-sm font-bold font-mono text-cyan-400">
                  GPIO 18 = {isLightOn ? 'HIGH (1 / 3.3V)' : 'LOW (0 / 0.0V)'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400">Poll Endpoint</span>
              <div className="text-xs font-mono text-slate-300">/api/iot/relay</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 gap-2">
            <button
              onClick={() => setActiveTab('ESP32')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'ESP32'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>ESP32 / Arduino C++</span>
            </button>
            <button
              onClick={() => setActiveTab('CURL')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'CURL'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>cURL / REST API</span>
            </button>
            <button
              onClick={() => setActiveTab('HOME_ASSISTANT')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'HOME_ASSISTANT'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Home Assistant</span>
            </button>
          </div>

          {/* Code Viewer */}
          <div className="relative">
            <div className="absolute top-2.5 right-2.5 z-10">
              <button
                onClick={() => {
                  const txt =
                    activeTab === 'ESP32'
                      ? esp32Code
                      : activeTab === 'CURL'
                      ? curlCode
                      : haYaml;
                  copySnippet(txt, activeTab);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow"
              >
                {copiedTab === activeTab ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-72 leading-relaxed">
              {activeTab === 'ESP32' && esp32Code}
              {activeTab === 'CURL' && curlCode}
              {activeTab === 'HOME_ASSISTANT' && haYaml}
            </pre>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
