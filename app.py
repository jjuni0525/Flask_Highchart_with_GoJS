from flask import Flask, render_template, make_response, url_for, request
from beacontools import BeaconScanner, IBeaconFilter, CYPRESS_BEACON_DEFAULT_UUID
from binascii import hexlify
import json
import numpy as np
import pandas as pd
import glob
import array
import time
import datetime
import csv
import asyncio

app = Flask(__name__)
json_data = {}
ip_addr = '0.0.0.0'
port = '8080'
header = ['beacon_format', 'uuid', 'major', 'minor', 'timestamp', 'time', 'temp', 'hum', 'rssi', 'byte_data']

@app.route('/')
def index():
    files = glob.glob("../day_*.csv")
    #-1 to use most recent data
    df = pd.read_csv(files[-1], names = header)
    if not df.major.empty:
        df.major.astype(np.int64)
        #Major over 10 is not the packet we want
        df = df[(df.major < 10)]
        tSeries = json.loads(getSeries(df,'temp'))
        hSeries = json.loads(getSeries(df,'hum'))

        series = [tSeries, hSeries]

    return render_template('index.html', series = series)

@app.route('/receiveJSON', methods = ['POST'])
def receiveJSON():
    data = request.get_json()

    if data != None:
        with open('saved_data.json', 'w') as f:
            f.write(json.dumps(data, indent = 2))

    return json.dumps(data)

@app.route('/getJSON', methods = ['GET'])
def getJSON():
    with open('saved_data.json', 'r') as f:
        data = json.load(f)

    return json.dumps(data)

@app.route('/new_data', methods = ['GET'])
def new_data():
    res = make_response(json.dumps(json_data))
    res.headers['Content-Type'] = 'application/json'
    res.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    res.headers['Access-Control-Allow-Origin'] = '*'
    return res


@app.route('/broadcast', methods = ['GET'])
async def _broadcast():
    import os
    from datetime import datetime
    #adv_data = "1e 02 0a 1a 1a ff 4c 00 02 15 00 05 00 01 00 00 10 00 80 00 00 80 5f 9b 01 31 00 30 88 6a FF 00"
    adv_data = "1e 02 0a 1a 1a ff 4c 00 02 15 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00"

    os.system("sudo hciconfig hci0 noleadv")
    os.system("sudo hcitool -i hci0 cmd 0x08 0x0008 " + adv_data)
    os.system("sudo hciconfig hci0 leadv 3")

    #await asyncio.sleep(0)

def broadcast():
    loop = asyncio.get_event_loop()
    asyncio.ensure_future(_broadcast())
    loop.run_forever()
    loop.close()
    return


def data_to_binstring(data):
    return array.array('B',data).tostring()

def callback(bt_addr, rssi, packet, additional_info, pkt):

    json_data['beacon_format'] = 'iBeacon'
    json_data['uuid'] = packet.uuid
    json_data['major'] = packet.major
    json_data['minor'] = packet.minor
    json_data['timestamp'] = int(round(time.time() * 1000))
    json_data['time'] = str(datetime.datetime.fromtimestamp(json_data['timestamp']//1000))
    json_data['temp'] = packet.cypress_temperature
    json_data['hum'] = packet.cypress_humidity
    json_data['rssi'] = rssi
    json_data['byte_data'] = hexlify(data_to_binstring(pkt[14:-1])).decode('ascii')

    filename1 = json_data['time'][:10]
    with open('../day_' + str(filename1) + '.csv', 'a') as f1:
        csv.writer(f1).writerow(json_data[h] for h in header)


    filename2 = json_data['time'][8:10]
    if filename2 >= '16' :
        filename2 = json_data['time'][:8] + '16'
    else:
        filename2 = json_data['time'][:8] + '01'
    with open('../2weeks_' + str(filename2) + '.csv', 'a') as f2:
        csv.writer(f2).writerow(json_data[h] for h in header)


    filename3 = json_data['time'][:8] + '01'
    with open('../month_' + str(filename3) + '.csv', 'a') as f3:
        csv.writer(f3).writerow(json_data[h] for h in header)

def getSeries(df, option):
    #option is 'temperature' 'humidity'
    major_type = df.major.unique()
    series = '['
    for i in range(len(major_type)):
        major = major_type[i]
        series += '{"name":"Major ' + str(major) + '","data":['
        for index, row in df.iterrows():
            if row['major'] == major:
                series += '[' + str(row['timestamp']) + ',' + str(int(row[option])) + '],'

        series = series[:-1]
        series += ']},'

    series = series[:-1] + ']'

    return series

if __name__ == '__main__':
    scanner = BeaconScanner(callback, device_filter=IBeaconFilter(uuid=CYPRESS_BEACON_DEFAULT_UUID))
    scanner.start()

    app.run(debug = False, host = ip_addr, port = port)
