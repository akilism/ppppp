WEBPACK_BINARY='./node_modules/.bin/webpack'
build:
	$(WEBPACK_BINARY)

watch:
	$(WEBPACK_BINARY) --watch
