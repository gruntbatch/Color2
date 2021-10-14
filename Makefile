include credentials.mk

.PHONY: all
all: Color2.zxp

Color2.zxp:
	mkdir -p build
	cp $(shell git ls-files) build
	ZXPSignCmd-64bit -sign build Color2.zxp $(P12_CERT) $(P12_PASS)
