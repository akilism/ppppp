.PHONY: build watch

WEBPACK_BINARY='./node_modules/.bin/webpack'

build:
	$(WEBPACK_BINARY) --config webpack.config.lib.js

watch:
	$(WEBPACK_BINARY) --watch --config webpack.config.examples.js
