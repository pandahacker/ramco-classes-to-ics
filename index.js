var express = require('express');
var moment = require('moment-timezone');
var rp = require('request-promise');
var ics = require('ics');
require('dotenv').config();

var app = express();
app.listen(3000);

app.get('/', function (req, res) {


    month = moment().format("MM")
    year = moment().format("YYYY")

    if (month === "01" || month === "03" || month === "05" || month === "07" || month === "08" || month === "10" || month === "12") {
        dateStart = moment().format("YYYY-MM-") + "01";
        dateEnd = moment().format("YYYY-MM-") + "31";
    }
    else if (month === "04" || month === "06" || month === "09" || month === "11") {
        dateStart = moment().format("YYYY-MM-") + "01";
        dateEnd = moment().format("YYYY-MM-") + "30";
    }
    else if (month === "02") {
        if (parseInt(year) % 4 === 0) {
            dateStart = moment().format("YYYY-MM-") + "01";
            dateEnd = moment().format("YYYY-MM-") + "29";
        }
        else {
            dateStart = moment().format("YYYY-MM-") + "01";
            dateEnd = moment().format("YYYY-MM-") + "28";
        }
    }

    var options = {
        method: 'POST',
        uri: process.env.API_URL,
        formData: {
            Key: process.env.API_KEY,
            Operation: 'GetEntities',
            Entity: 'cobalt_class',
            Filter: `cobalt_classbegindate<ge>${dateStart} AND cobalt_classbegindate<le>${dateEnd}`,
            Attributes: 'cobalt_classbegindate,cobalt_classenddate,cobalt_classid,cobalt_locationid,cobalt_name,cobalt_description,cobalt_locationid,cobalt_cobalt_tag_cobalt_class/cobalt_name,cobalt_fullday'
        }
    }
    rp(options).then(function (body) {

        var data = JSON.parse(body);

        data = data.Data

        const modifiedData = data.map(function (data) {

            var start = moment.tz(data.cobalt_ClassBeginDate.Display, 'Etc/GMT');
            var end = moment.tz(data.cobalt_ClassEndDate.Display, 'Etc/GMT');

            data.cobalt_ClassBeginDate.Display = start.tz('America/New_York').format('YYYY-M-D-H-m').split("-");
            data.cobalt_ClassEndDate.Display = end.tz('America/New_York').format('YYYY-M-D-H-m').split("-");

            const tags = data.cobalt_cobalt_tag_cobalt_class.map(function (data) {
                return data.cobalt_name;
            });

            data.cobalt_cobalt_tag_cobalt_class = tags;

            var event = {
                start: data.cobalt_ClassBeginDate.Display,
                end: data.cobalt_ClassEndDate.Display,
                title: data.cobalt_name,
                description: data.cobalt_Description,
                location: data.cobalt_LocationId.Display,
                categories: data.cobalt_cobalt_tag_cobalt_class,
                uid: data.cobalt_classId
            };

            return event;

        });

        const { error, value } = ics.createEvents(modifiedData)

        if (error) {
            console.log(error)
            return
        }
        res.send(value);

    });


});

app.get('/ics', function (req, res) {
    res.sendFile('event.ics');
});