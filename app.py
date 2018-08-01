from flask import Flask, render_template, make_response, url_for, request
import json
import numpy as np
import pandas as pd
import json
import glob

app = Flask(__name__)

@app.route('/')
def index():
    files = glob.glob("*.csv")
    df = pd.read_csv(files[0]) 
    # names = ['FORMAT', 'UUID', 'MAJOR', 'MINOR', 'TIME', 'TIMESTAMP', 'TEMPERATURE', 'HUMIDITY', 'RSSI', 'BYTE_DATA'])
    df.MAJOR.astype(np.int64)
    #Major over 10 is not the packet we want
    df = df[(df.MAJOR < 10)]
    tSeries = json.loads(getSeries(df,'TEMPERATURE'))
    hSeries = json.loads(getSeries(df,'HUMIDITY'))

    series = [tSeries, hSeries]
    print(series)

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
     
def getSeries(df, option):
    #option is 'temperature' 'humidity'
    major_type = df.MAJOR.unique()
    series = '['
    for i in range(len(major_type)):
        major = major_type[i]
        series += '{"name":"Major ' + str(major) + '","data":['
        for index, row in df.iterrows():
            if row['MAJOR'] == major:
                series += '[' + str(row['TIMESTAMP']) + ',' + str(int(row[option])) + '],'
                   
        series = series[:-1]
        series += ']},'

    series = series[:-1] + ']'

    return series

if __name__ == '__main__':
    app.run(debug = True, host = '127.0.0.1', port = 5000)
