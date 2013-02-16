

(function( $ ){

    var MCAL_CLASS           = "mcalendar",
        MCAL_HTML            = "<div class='"+ MCAL_CLASS +"'> </div> <div class='label label-main'> </div>",
        MIN_M_DIMENSIONS     = {width: 50, height: 50},
        MIN_W_DIMENSIONS     = {width: 50, height: 10},
        MIN_F_DIMENSIONS     = {width: 600, height: 50, autoGrow: false},
        MODES                = ["week", "month", "full"],
        MONTHS               = ["January", "February", "March", "April", "May", "June", "July",
                                "August", "September", "October", "November", "December"],
        Calendar;

    /**
     * Constructor:
     *
     * @param options
     * @constructor
     */
    Calendar = function (options) {

        var self                = this,
            opt                 = options,
            default_mode        = MODES[2],
            mode                = default_mode,
            parent_el_dimension,
            default_dimension ,
            dimensions;

        //Section: Initialize parameters -------------------------------

        //Grab element selectors
        self.anchorSelector = opt.rootSelector + " ." + MCAL_CLASS;

        self.$mainLabel         = $(opt.rootSelector + " .label.label-main");
        self.$root              = $(opt.rootSelector);

        //Set mode
        if (opt.viewMode && $.inArray(opt.viewMode, MODES)!== -1) {
            mode = opt.viewMode;
        }

        //Set dimensions
        default_dimension   = (mode === MODES[0]) ? MIN_W_DIMENSIONS : (mode === MODES[1]) ? MIN_M_DIMENSIONS : MIN_F_DIMENSIONS;
        parent_el_dimension = { width: self.$root.width(), height: self.$root.height()}

        dimensions = options.dimensions ?
            self._calcDimensions(options.dimensions, default_dimension) :
            self._calcDimensions(parent_el_dimension, default_dimension);

        //Set instance variables
        self.mode = mode;
        self.dimensions = dimensions;

        self.meta       = opt.meta || {};
        self.showLabel  = determineLabelParam(opt.showLabel);
        self.data = opt.data;
        self.margin = opt.margin || {t:0, r:0, b:0, l:0};

        self.timestamp = (opt.accessors && opt.accessors.getTimestamp) ?
            opt.accessors.getTimestamp : function (d) {return d._groupby};

        self.counts    = (opt.accessors && opt.accessors.getCount) ?
            opt.accessors.getCount : function (d) {return d._count};

        self.onclick   = (opt.events && opt.events.onclick) ?
            opt.events.onclick : $.noop;

        self.onmouseover = (opt.events && opt.events.onmouseover) ?
            opt.events.onmouseover : $.noop;

        //If we are in month or week view ----
        if ((mode !== MODES[2])) {

            self._createSvg();
            self.cellSize = self._calc_optimalCellsize();

            if ((mode === MODES[0])) {

                self._preprocessDataWeekView();
                self._initWeekGrid();

            } else {

                self._preprocessDataMonthView();
                self._initMonthGrid();
            }


        } else {
            //We are in full view, and hence we render entirely differently

            self._preprocessDataFullView();
            self._createSvgForFullView();
        }


        //Once everything is rendered, we show and
        //hide the labels accordingly
        if(!self.showLabel.showMain) {
            $(opt.rootSelector + " .label-main").hide()
        }

        if(!self.showLabel.showYear) {
            $(opt.rootSelector + " .label-year").hide()
        }

        if(!self.showLabel.showMonth) {
            $(opt.rootSelector + " .label-month").hide()
        }

    };


    /**
     * Utility function, this will do a groupby on the key
     *
     * @param format: this formats the data to what we want
     * @param data
     * @return {*}
     * @private
     */
    Calendar.prototype._nestData = function (format, data) {

        var self = this,
            key  = self.timestamp,
            nest = d3.nest()
                .key(function(d) {return format(ISOToDate(key(d)));})
                .entries(data);

        return nest;
    };

    Calendar.prototype._tokenizeDateStr = function (date) {
        return $.map(date.split("-"), function(item) { return parseInt(item, 10) });
    };

    /**
     * We are in week mode, process the data needed
     * to draw the week calendar
     * @private
     */
    Calendar.prototype._preprocessDataWeekView = function () {

        var self   = this,
            format  = d3.time.format("%Y-%m-%d"),
            normalizedData = [],
            tokens,
            nest;

        nest = self._nestData(format, self.data);

        if(nest.length > 7) {
            console.log("Warning: Data array contains elements that span over 7 days. Taking the first 7 days only")
        }

        //Tokenize key to year, month and
        //convert from months indexed starting from 1 to zero
        //IE: from Jan = 1 to Jan = 0
        tokens = nest[0].key.split("-");
        tokens[0] = parseInt(tokens[0], 10);
        tokens[1] = parseInt(tokens[1], 10) - 1;
        tokens[2] = parseInt(tokens[2], 10);

        nest.forEach(function (item) {
            normalizedData[item.key] =item.values;
        })

        self.dateData = {month: tokens[1],
            year:  tokens[0],
            day:   tokens[2],
            strDate: nest[0].key,
            data: normalizedData};

        //Set the data for the label
        self.$mainLabel.html(self.dateData.strDate)

    };

    /**
     * We need to process the data in order to extract information about the dates. IE, what months
     * exists in the data set, what years we are dealing with. This function extracts meta data from the
     * data set which is needed to draw the month and days
     *
     * If more than one month appears in the data set, we take the first one that shows
     * @private
     */
    Calendar.prototype._preprocessDataMonthView = function () {

        var self           = this,
            monthFormat    = d3.time.format("%Y-%m"),
            dayFormat      = d3.time.format("%Y-%m-%d"),
            normalizedData = {},
            tokens,
            nest;

        nest = self._nestData(monthFormat, self.data);

        if(nest.length > 1) {
            console.log("Warning: Data array contains elements that span several months. Taking the first month only")
        }

        //Tokenize key to year, month and
        //convert from months indexed starting from 1 to zero
        //IE: from Jan = 1 to Jan = 0
        tokens = nest[0].key.split("-");
        tokens[0] = parseInt(tokens[0], 10);
        tokens[1] = parseInt(tokens[1], 10) - 1;

        // normalize -- create a map where each key is a day, and
        // value is an array containing all the matches
        d3.nest()
            .key(function(d) { return dayFormat(ISOToDate(self.timestamp(d)));})
            .entries(nest[0].values)
            .forEach(function (item) {
                normalizedData[item.key] =item.values;
            })

        self.dateData = {month: tokens[1],
            year:  tokens[0],
            strDate: MONTHS[tokens[1]] + " " + tokens[0],
            data: normalizedData};

        //Set the data for the label
        self.$mainLabel.html(self.dateData.strDate)
    };

    /**
     * Process the data for the full view. Extract information from the data
     * fields, figure out the total range and normalize
     * @private
     */
    Calendar.prototype._preprocessDataFullView = function () {

        var self           = this,
            data           = self.data,
            monthFormat    = d3.time.format("%Y-%m"),
            dayFormat      = d3.time.format("%Y-%m-%d"),
            normalizedData = {},
            index,
            range,
            obj,
            key,
            values,
            nest;

        nest = d3.nest()
            .key(function(d) { return monthFormat(ISOToDate(self.timestamp(d)));})
            .key(function(d) { return dayFormat(ISOToDate(self.timestamp(d)));})
            .entries(data);

        range = d3.extent(nest, function(d) {return d.key});


        for(index = 0 ; index < nest.length; index++) {

            key    = nest[index].key;
            values = nest[index].values;
            obj = {};

            values.forEach(function(item){ obj[item.key] = item.values;})

            normalizedData[key] = obj;
        }

        self.dateData = {startRange: self._tokenizeDateStr(range[0]),
            endRange:  self._tokenizeDateStr(range[1]),
            strDate: range[0] +"/"+range[1],
            data: normalizedData};

        self.$mainLabel.html(self.dateData.strDate)
    };

    /**
     * ensure the dimensions don't have a width and height smaller than the default
     * specified in the fallback object
     */
    Calendar.prototype._calcDimensions = function (dimensions, fallback) {

        var tmpWidth   = dimensions.width < fallback.width ? fallback.width : dimensions.width,
            tmpHeight  = dimensions.height < fallback.height ? fallback.height : dimensions.height,
            dimensions = {width: tmpWidth, height: tmpHeight, autoGrow: dimensions.autoGrow};

        return dimensions;
    };

    /**
     * Given the dimensions of the control view, figure out the
     * best possible cellsize
     * @return {Number}
     * @private
     */
    Calendar.prototype._calc_optimalCellsize = function () {

        var self   = this,
            width  = self.dimensions.width,
            height = self.dimensions.height,
            obj    = (self.mode === MODES[1]) ?
            {width : (width/7), height: (height/6)} :
            {width : (width/7), height: (height)}

        return obj;
    };

    /**
     * This function will create the SVG container for the control.
     * It will be sized according to the parameters passed in, or the
     * defaults
     *
     * @private
     */
    Calendar.prototype._createSvg = function () {

        var self      = this,
            width     = self.dimensions.width,
            height    = self.dimensions.height,
            mode      = self.mode;

        //Create svg containers
        self.svg = d3.select(self.anchorSelector)
            .append("svg")
            .attr("class", "svg-window")
            .attr("class", "calendar-"+mode)
            .attr("width", width)
            .attr("height", height)
            .append("g");

    };

    /**
     * Draw the grid a week view
     *
     * @private
     */
    Calendar.prototype._initWeekGrid = function () {

        var self     = this,
            dateData = self.dateData,
            data     = dateData.data,
            day      = d3.time.format("%w"),
            format   = d3.time.format("%Y-%m-%d"),
            datum    = self._datum.bind(this, format, data),
            cellSize = self.cellSize,
            index    = 0,
            days;

        days = d3.time.days(new Date(dateData.year, dateData.month, dateData.day),
            new Date(dateData.year, dateData.month, dateData.day + 7))

        //Create a cell for each day in the 7 day period
        self.rect = self.svg
            .selectAll(".day")
            .data(days)
            .enter()
            .append("rect")
            .attr("width", cellSize.width)
            .attr("height",cellSize.height)
            .attr("x", function(d) { return (index++ * cellSize.width);})
            .datum(datum)
            .on("click", self.onclick)
            .on("mouseover", self.onmouseover);

        self._finishLabelling();
    };

    /**
     * This function will draw the grid
     *
     * @private
     */
    Calendar.prototype._initMonthGrid = function () {

        var self     = this,
            day      = d3.time.format("%w"),
            format   = d3.time.format("%Y-%m-%d"),
            data     = self.dateData.data,
            cellSize = self.cellSize,
            datum    = self._datum.bind(this, format, data),
            index    = 0,
            days;

        function calcYOffset (d) {
            index = (d.getDate() === 1) ? parseInt(day(d), 10) : index+1;
            return ( Math.floor(index/7) * cellSize.height);
        }

        days = d3.time.days(new Date(self.dateData.year, self.dateData.month, 1),
            new Date(self.dateData.year, self.dateData.month + 1, 1))

        //Create a cell for each day in the month
        self.rect = self.svg
            .selectAll(".day")
            .data(days)
            .enter()
            .append("rect")
            .attr("width", cellSize.width)
            .attr("height", cellSize.height)
            .attr("x", function(d) { return (day(d) * cellSize.width);})
            .attr("y", calcYOffset)
            .datum(datum)
            .on("click", self.onclick)
            .on("mouseover", self.onmouseover);

        self._finishLabelling();
    };

    /**
     * This will draw the rect svg objects in the respective month svg elements
     * @param key
     * @param cellSize
     * @param calData
     * @param days
     * @private
     */
    Calendar.prototype._initFullViewGrid = function (key, cellSize, calData, days) {

        var self     = this,
            day      = d3.time.format("%w"),
            format   = d3.time.format("%Y-%m-%d"),
            data     = calData,
            cellSize = cellSize,
            datum    = self._datum.bind(this, format, data),
            index    = 0;

        function calcYOffset (d) {
            index = (d.getDate() === 1) ? parseInt(day(d), 10) : index+1;
            return ( Math.floor(index/7) * cellSize.height);
        }

        self.rect = d3.select(self.anchorSelector + " .d"+key + " g")
            .selectAll(".day")
            .data(days)
            .enter()
            .append("rect")
            .attr("width", cellSize.width)
            .attr("height", cellSize.height)
            .attr("x", function(d) { return (day(d) * cellSize.width);})
            .attr("y", calcYOffset)
            .attr("class", "day")
            .datum(datum)
            .on("click", self.onclick)
            .on("mouseover", self.onmouseover);

        self._finishLabelling();
    };


    /**
     * Restructure the format of the data bound to
     * the svg element
     *
     * Every day rectangle will have an object of this
     * structure
     *
     * @param format
     * @param data
     * @param d
     * @return {Object}
     * @private
     */
    Calendar.prototype._datum = function (format, thedata, d) {

        var self      = this,
            data      = thedata || {},
            dayFormat = format(d),
            matches   = data[format(d)] || [],
            sum       = d3.sum(matches, self.counts)

        return {date: dayFormat,
            matches: matches,
            sumMatchCount: sum,
            meta: self.meta};
    }

    /**
     * This function will finish labeling the day
     * rectangles. It will add classes to the
     * svg element depending on what data is
     * bound to it
     * @private
     */
    Calendar.prototype._finishLabelling = function () {

        var self = this;

        function createClassStr(d) {

            var toRet = "day ";

            if(d.matches.length > 0) {
                toRet += "matched "
            }

            if(d.sumMatchCount > 0) {
                toRet += "hascount";
            }

            return toRet;
        }

        //Append the date as a 'title' element
        self.rect
            .attr("class", createClassStr)
            .append("title")
            .text(function(d) {return d.date });

    };


    Calendar.prototype._createSvgForFullView = function () {

        var self      = this,
            margin    = self.margin,
            data      = self.dateData,
            numbYears = (data.endRange[0] - data.startRange[0]) + 1,
            height    = self.dimensions.autoGrow ?
                self.dimensions.height - 2 :
                Math.floor(self.dimensions.height/ numbYears) - 2,
            width     = self.dimensions.width,
            mHeight   = height  - 2 - margin.t - margin.b,
            mWidth    = (width/12) -2 - margin.l - margin.r,
            cellSize  = {width : Math.floor((mWidth/7)), height: (mHeight/6) },
            format_m    = d3.time.format("%Y-%m");

        console.log(self.dimensions)
        //Create svg containers
        self.yearWrapper = d3.select(self.anchorSelector)
            .selectAll("div")
            .data(d3.range(data.startRange[0], data.endRange[0] + 1))
            .enter()
            .append("div")
            .attr("class", function (d) {return "calendar-year d" + d;})
            .attr("style", function(d) {
                return "width:" + width +"px; height:" + height +"px; position:relative"
            })

        self.yearWrapper
            .append("div")
            .attr("class", "label label-year")
            .attr("style", "position:absolute;")
            .text(function(d) { return d})

        self.monthsWrapper = self.yearWrapper
            .selectAll(".calendar-year")
            .data(function(d){

                return  d3.time.months(new Date(d, 0, 1), new Date(d , 12, 1)).map(function(item){
                    return format_m(item);
                });
            })
            .enter()
            .append("div")
            .attr("class","month-wrapper-do-not-style")
            .attr("style","display:inline-block; position: relative")
            .append("svg")
            .attr("class", function(d){
                return "calendar-month d" +d
            })
            .attr("width", mWidth)
            .attr("height", mHeight)
            .attr("style", function(d){
                return "margin:" + margin.t +"px "+ margin.r +"px "+ margin.b+"px "+ margin.l +
                    "px; -webkit-box-sizing: border-box;";
            })


        self.monthsWrapper
            .append("g")
            .each(function(d){

                var token = d.split("-").map(function(item) {
                    return parseInt(item, 10);
                });

                token[1] = token[1]-1;

                var days = d3.time.days(new Date(token[0], token[1], 1),
                    new Date(token[0], token[1] + 1, 1))

                $(this.parentNode.parentNode)
                    .append("<div class='label label-month' style='position:absolute;'>" + MONTHS[token[1]] + "</div>")

                self._initFullViewGrid(d, cellSize, self.dateData.data[d], days);
            })

    };


    var methods = {

        init : function(options) {

            var data = this.data(MCAL_CLASS),
                o = options || {},
                obj;

            //Sanity Check: -----------------------------
            // Make sure they are calling init
            // on one element at a time
            if(this.length > 1) {
                console.error("Warning: you can only initialize one element at a time");
                return this;
            }

            //Sanity Check: -----------------------------
            // Make sure element isn't already a
            // calendar
            if(data && data.calendar) {
                console.error("Warning: this element has already been initialized as an mcalendar");
                return this;
            }

            //Sanity Check: -----------------------------
            // Make sure d3 exists
            if(!d3) {
                console.error("Warning: d3 library not loaded");
                return this;
            }

            //Sanity Check: -----------------------------
            // Make sure a data array was passed in
            if(!o.data) {
                console.error("Warning: A data array needs to be passed in");
                return this;
            }

            //Render base html wrapper
            this.html(MCAL_HTML);

            obj = new Calendar({rootSelector: this.selector,
                viewMode: o.viewMode,
                dimensions: o.dimensions,
                margin: o.margin,
                data: o.data,
                showLabel: o.showLabel,
                accessors: o.accessors,
                meta:   o.meta,
                events: o.events});

            $(this).data(MCAL_CLASS, { calendar : obj});

            return this;
        },

        reset : function () {

            return this;
        }

    };


    /**
     * Okay, we're not fully parsing an ISO because
     * we're going to allow spaces and the lack of
     * T and Z characters
     * @param dateString
     * @return {Date}
     * @constructor
     */
    function ISOToDate (dateString) {

        if (!dateString || typeof dateString !== 'string') {
            throw new Error("Argument to ISOToDate must be a string");
        }

        var yyyy = parseInt(dateString.slice(0, 4), 10),
            mm   = parseInt(dateString.slice(5, 7), 10) - 1,
            dd   = parseInt(dateString.slice(8, 10), 10),
            HH   = parseInt(dateString.slice(11, 13), 10),
            MM   = parseInt(dateString.slice(14, 16), 10),
            SS   = parseInt(dateString.slice(17, 19), 10),
            dateObject = new Date(yyyy, mm, dd, HH, MM, SS);

        return dateObject;
    };

    /**
     * This is used to determine the correct show label parameter. The result
     * of this function will be used to show and hide labels
     * @param showLabel
     * @return {Object}
     */
    function determineLabelParam (showLabel) {

        var toRet = {showMain: false, showYear: false, showMonth:false};

        if(!showLabel) {
            return toRet;
        }

        if(typeof showLabel === 'boolean') {
            toRet.showMain = showLabel;
            return toRet;
        }

        if(typeof showLabel === 'object') {

            toRet.showMain = !!showLabel.main;
            toRet.showYear = !!showLabel.year;
            toRet.showMonth =!!showLabel.month;

            return toRet;
        }

        return toRet;
    }


    $.fn.mcalendar = function(method) {

        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || ! method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' +  method + ' does not exist on jQuery.mcalendar');
        }

    };

})( jQuery );
