
#READ ME


This project endeavours to wrap a d3js calendar view in a jquery plugin. You 
instantiate the calendar in the same fashion as any jquery plugin. The only 
dependencies for this project are d3js and jquery.


<div id="myCalendar"> </div>

$("#myCalendar").mcalendar(options)



STYLING:

The calendar plugin will add classes to each html element it creates. These 
classes will allow you to style the calendar via css.

classes:

mcalendar       : wrapper around the entire calendar
calendar-month  : The SVG container object for the month view
calendar-week   : the SVG container object for the week view
day             : the rect svg object
matched         : added to each rect object if an element from the data array (see below)
                  landed on a day in the calendar view
hascount        : added to each rect object the 1 or more elements from the data array
                  landed on the day in the calendar view AND the aggregates of their
                  counts is larger than 0
label           : universal class for labels
label-main      : class for main label, in the case of the month and week view, this is the only label
label-month     : class for each month label (**NOTE: this is absolutely positioned, set top, right, bottom, left)
label-year      : class for each year label (**NOTE: this is absolutely positioned, set top, right, bottom, left)
calendar-year   : class for wrapper div containing all elements for a year
intensity-level-X : class to specify how many counts appear for a single day, ranges from 0-10. 0 being no counts, 10
                    being Max number of accumulated counts per day in the passed in data set. Use this class
                    in lieu of "matched" and "hascount" in order to give a heat-map effect.


month-wrapper-do-not-style: this is a wrapper label used in the full view. It is recommend you DO NOT add style to this


Options:

This calendar was built to be data agnostic, meaning that the data it displays
in the view can be arbitrary. Use these parameters to set up the calendar plugin.


    A) viewMode
    B) showLabel
    C) dimensions
    D) data
    E) accessors
    F) events
    G) meta
    H) margin - available only in "full" view mode



A) viewMode - (optional)

This parameter dictates how the calendar is rendered; either displaying
data in an entire month, a consecutive 7 day period, or it will go through the
data you pass in, determine the number of years the data spans, and draw a calendar month
for each month of the year


values: "week" , "month", "full" (string)
default: full


B) showLabel - (optional)

This parameter causes the calendar label to appear or to be hidden. Ever calendar will
have at least 1 label, called label-main. For the full view, you will have a set of label-year
and label-month labels as well.


values: true/false (booleab) or object {main:bool, month:bool, year:bool}
default: false


If you pass in only a boolean, it will effect only the main label. If you are in full view mode
you have the ability to also display or hide the month and year labels independently.


C) dimensions - (optional)

This parameter tells the calendar what size to render at. Use this if
you want to explicitly set the dimensions of the calendar. If you do NOT
set this parameter the calendar will default to the size of the containing
element for the calendar. NOTE: there are default minimums for each view.


values: {width: XXX, height: YYYY, autoGrow: boolean}
default: size of containing element (if you want to set the size via css and not js)

Default min dimensions are

Month view  = {width: 50, height: 50},
Week view   = {width: 50, height: 10},
Full view   = {width: 600, height: 50},

NOTE: autoGrow param is available in Full view only. Pass in a parameter of autoGrow=true for the year view,
and the calendar will grow in height. That is, each year row will have a constant height, the total
height of the calendar will be (NumberOfYears * height)


D) data - (required)

This takes a json array, each object in the array must contain at least two values: a)
timestamp, b) a count. These values are used to set the date and the matches number
in the calendar

E.G: data = [{_groupby: XX, _count: YY}, {_groupby: XX, _count: YY}, {_groupby: XX, _count: YY}]

Depending on the view mode, the data will be aggregated accordingly. 

** NOTE: 
If you are in month view mode, and you pass in a data array which spans across several months
the calendar view will select the first month it sees and only map data for that month 
onto the calendar view.

If you are in week mode, and you pass in data that spans across more than 7 days. The calendar
view will select the first day it sees, and generate a view for the next 7 days

If you are in full view mode, the plugin will determine the correct number of months to display.


E) accessors - (optional)

This is javascript object which contains two functions. The functions tell the calendar
plugin how to acess the date field, and the count field within the data object. Use 
parameter if your data array contains a javascript object that doesn't have the fields
_groupby or _count.


value: {getTimestamp: function (d) { return d.fieldContainingTimestamp,
        getCount: function (d) { return d.fieldContainingCount}}

default: {getTimestamp: function (d) {return d._groupby, 
          getCount: function (d) { return d._count}}

E.G: if your data array contains objects like data = [{datetime:XX, sum:XX}]

then accessors: {getTimestamp: function (d) { return d.datetime,
                 getCount: function (d) { return d.sum}}


NOTE: There is a restriction that the date field passed in must be in ISO8601 format. (a string missing
the T and Z characters in the format is okay)

YYYY-MM-DD HH:mm:SS


F) events - (optional)

The calendar plugin will respond to two events. You can pass in callback functions
for each event. For each event, the calendar will pass in a json object. 

value: {onclick: function (d) {//do stuff}, onmouseover: function (d) {//do stuff}}
default:  {onclick: $.noop, onmouseover: $.noop}

The parameter passed into to each callback is 

d = {
    date: "YYYY-MM-DD",
    matches: [] //this is a subset of the array you passed in as the "data" parameter
    sumMatchCount: INT //the aggregate count from the count field in matches array
    meta: user specified //the calendar will pass back exactly what was passed in 
                         //as the meta parameter
}

G) margin - (optional) available only in full view mode


This parameter is used to safely set the margins of each calendar month inside a year. If you use this
property, the calendars will always be spaced correctly to fit within the "dimensions" you specified.

value: {t:int, r:int, b:int, l:int} pass ints in to determine the pixel values of the margins.
default: {t:0, r:0, b:0, l:0}


example: {t: 5, r:5, b:20, l:5}

This will create top, right, left margins of 5px, and a bottom margin of 20px. This can be used when you want
to place the month label at the bottom of the calendar


NOTE:If you use css to style the margins, it will likely cause the months to be displayed incorrectly. If you want
any kind of spacing between months, use this parameter.




Code Examples:

<div id="calendar-anchor">  </div>



<script>

    //Option param declaration -------------
    var getId = function (obj) { return obj._groupby;};
    var getCount = function (obj) { return obj._count;}

    var onclick = function (d) {
                   console.log("click")
                   console.log(d);
               }

    var onmouseover = function (d) {
                        console.log("mouseover")
                        console.log(d);
                    }

    var  events = { onclick: onclick,
                    onmouseover: onmouseover
                }

    var accessors = {getTimestamp: getId,
                     getCount: getCount}


    //Compose options object ----------------
    var obj = {viewMode: "month",
              showLabel: true,
              data:myDataArray,
              accessors: accessors,
              events:  events,
              dimensions: {width:100, height:100}};



    //Instantiate jquery plugin ---------------
    $("#calendar-anchor").mcalendar(obj);

</script>


