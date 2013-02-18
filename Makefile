HR=\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#

#
# BUILD DOCS
#

build:
	@echo "Minifying scripts ..."
	@uglifyjs -nc scripts/mcalendar.js > scripts/mcalendar.min.js
