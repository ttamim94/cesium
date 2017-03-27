/*global defineSuite*/
defineSuite([
        'Scene/GoogleEarthEnterpriseImageryProvider',
        'Core/DefaultProxy',
        'Core/defaultValue',
        'Core/defined',
        'Core/loadImage',
        'Core/loadJsonp',
        'Core/loadWithXhr',
        'Core/Math',
        'Core/TerrainProvider',
        'Core/WebMercatorTilingScheme',
        'Scene/BingMapsStyle',
        'Scene/DiscardMissingTileImagePolicy',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'ThirdParty/when'
    ], function(
        GoogleEarthEnterpriseImageryProvider,
        DefaultProxy,
        defaultValue,
        defined,
        loadImage,
        loadJsonp,
        loadWithXhr,
        CesiumMath,
        TerrainProvider,
        WebMercatorTilingScheme,
        BingMapsStyle,
        DiscardMissingTileImagePolicy,
        Imagery,
        ImageryLayer,
        ImageryProvider,
        when) {
    'use strict';

    // afterEach(function() {
    //     loadJsonp.loadAndExecuteScript = loadJsonp.defaultLoadAndExecuteScript;
    //     loadImage.createImage = loadImage.defaultCreateImage;
    //     loadWithXhr.load = loadWithXhr.defaultLoad;
    // });

    it('tileXYToQuadKey', function() {
        // http://msdn.microsoft.com/en-us/library/bb259689.aspx
        // Levels are off by one compared to the documentation because our levels
        // start at 0 while Bing's start at 1.
        expect(GoogleEarthEnterpriseImageryProvider.tileXYToQuadKey(1, 0, 0)).toEqual('2');
        expect(GoogleEarthEnterpriseImageryProvider.tileXYToQuadKey(1, 2, 1)).toEqual('02');
        expect(GoogleEarthEnterpriseImageryProvider.tileXYToQuadKey(3, 5, 2)).toEqual('021');
        expect(GoogleEarthEnterpriseImageryProvider.tileXYToQuadKey(4, 7, 2)).toEqual('100');
    });

    it('quadKeyToTileXY', function() {
        expect(GoogleEarthEnterpriseImageryProvider.quadKeyToTileXY('2')).toEqual({
            x : 1,
            y : 0,
            level : 0
        });
        expect(GoogleEarthEnterpriseImageryProvider.quadKeyToTileXY('02')).toEqual({
            x : 1,
            y : 2,
            level : 1
        });
        expect(GoogleEarthEnterpriseImageryProvider.quadKeyToTileXY('021')).toEqual({
            x : 3,
            y : 5,
            level : 2
        });
        expect(GoogleEarthEnterpriseImageryProvider.quadKeyToTileXY('100')).toEqual({
            x : 4,
            y : 7,
            level : 2
        });
    });

    it('decode', function() {
        CesiumMath.setRandomNumberSeed(123123);
        var data = new Uint8Array(1025);
        for (var i = 0; i < 1025; ++i) {
            data[i] = Math.floor(CesiumMath.nextRandomNumber() * 256);
        }

        var buffer = data.buffer.slice();
        var a = new Uint8Array(buffer);
        GoogleEarthEnterpriseImageryProvider._decode(buffer);
        expect(a).not.toEqual(data);

        // For the algorithm encode/decode are the same
        GoogleEarthEnterpriseImageryProvider._decode(buffer);
        expect(a).toEqual(data);
    });

    it('request Image populates the correct metadata', function() {
        var quad = '0123';
        var index = 0;
        var provider;
        spyOn(GoogleEarthEnterpriseImageryProvider.prototype, '_getQuadTreePacket').and.callFake(function(quadKey, version) {
            quadKey = defaultValue(quadKey, '') + index.toString();
            this._tileInfo[quadKey] = {
                bits : 0xFF,
                cnodeVersion : 1,
                imageryVersion : 1,
                terrainVersion : 1
            };
            index = (index + 1) % 4;

            return when();
        });

        var count = 0;
        var requestQuads = [GoogleEarthEnterpriseImageryProvider.tileXYToQuadKey(0, 0, 1), quad];
        var requestType = ['blob', 'arraybuffer'];
        spyOn(loadWithXhr, 'load').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual('http://test.server/3d/flatfile?f1-0' + requestQuads[count] + '-i.1');
            expect(responseType).toEqual(requestType[count]);
            ++count;
            deferred.resolve();
        });

        provider = new GoogleEarthEnterpriseImageryProvider({
            url: 'http://test.server/3d'
        });

        var tileXY = GoogleEarthEnterpriseImageryProvider.quadKeyToTileXY(quad);
        return provider.requestImage(tileXY.x, tileXY.y, tileXY.level)
            .then(function(image) {
                expect(GoogleEarthEnterpriseImageryProvider.prototype._getQuadTreePacket.calls.count()).toEqual(4);
                expect(GoogleEarthEnterpriseImageryProvider.prototype._getQuadTreePacket).toHaveBeenCalledWith();
                expect(GoogleEarthEnterpriseImageryProvider.prototype._getQuadTreePacket).toHaveBeenCalledWith('0', 1);
                expect(GoogleEarthEnterpriseImageryProvider.prototype._getQuadTreePacket).toHaveBeenCalledWith('01', 1);
                expect(GoogleEarthEnterpriseImageryProvider.prototype._getQuadTreePacket).toHaveBeenCalledWith('012', 1);

                var tileInfo = provider._tileInfo;
                expect(tileInfo['0']).toBeDefined();
                expect(tileInfo['01']).toBeDefined();
                expect(tileInfo['012']).toBeDefined();
                expect(tileInfo['0123']).toBeDefined();
            });
    });

    it('conforms to ImageryProvider interface', function() {
        expect(GoogleEarthEnterpriseImageryProvider).toConformToInterface(ImageryProvider);
    });

    it('conforms to TerrainProvider interface', function() {
        expect(GoogleEarthEnterpriseImageryProvider).toConformToInterface(TerrainProvider);
    });

    // it('constructor throws when url is not specified', function() {
    //     function constructWithoutServer() {
    //         return new BingMapsImageryProvider({
    //             mapStyle : BingMapsStyle.AERIAL
    //         });
    //     }
    //     expect(constructWithoutServer).toThrowDeveloperError();
    // });
    //
    // function createFakeMetadataResponse(mapStyle) {
    //     var stylePrefix = 'a';
    //     switch (mapStyle) {
    //     case BingMapsStyle.AERIAL_WITH_LABELS:
    //         stylePrefix = 'h';
    //         break;
    //     case BingMapsStyle.ROAD:
    //         stylePrefix = 'r';
    //         break;
    //     }
    //
    //     return {
    //         "authenticationResultCode" : "ValidCredentials",
    //         "brandLogoUri" : "http:\/\/dev.virtualearth.net\/Branding\/logo_powered_by.png",
    //         "copyright" : "Copyright © 2014 Microsoft and its suppliers. All rights reserved. This API cannot be accessed and the content and any results may not be used, reproduced or transmitted in any manner without express written permission from Microsoft Corporation.",
    //         "resourceSets" : [{
    //             "estimatedTotal" : 1,
    //             "resources" : [{
    //                 "__type" : "ImageryMetadata:http:\/\/schemas.microsoft.com\/search\/local\/ws\/rest\/v1",
    //                 "imageHeight" : 256,
    //                 "imageUrl" : "http:\/\/ecn.{subdomain}.tiles.virtualearth.net.fake.invalid\/tiles\/" + stylePrefix + "{quadkey}.jpeg?g=3031&mkt={culture}",
    //                 "imageUrlSubdomains" : ["t0", "t1", "t2", "t3"],
    //                 "imageWidth" : 256,
    //                 "imageryProviders" : [{
    //                     "attribution" : "© 2014 DigitalGlobe",
    //                     "coverageAreas" : [{
    //                         "bbox" : [-67, -179.99, 27, 0],
    //                         "zoomMax" : 21,
    //                         "zoomMin" : 14
    //                     }, {
    //                         "bbox" : [27, -179.99, 87, -126.5],
    //                         "zoomMax" : 21,
    //                         "zoomMin" : 14
    //                     }, {
    //                         "bbox" : [48.4, -126.5, 87, -5.75],
    //                         "zoomMax" : 21,
    //                         "zoomMin" : 14
    //                     }]
    //                 }, {
    //                     "attribution" : "Image courtesy of NASA",
    //                     "coverageAreas" : [{
    //                         "bbox" : [-90, -180, 90, 180],
    //                         "zoomMax" : 8,
    //                         "zoomMin" : 1
    //                     }]
    //                 }],
    //                 "vintageEnd" : null,
    //                 "vintageStart" : null,
    //                 "zoomMax" : 21,
    //                 "zoomMin" : 1
    //             }]
    //         }],
    //         "statusCode" : 200,
    //         "statusDescription" : "OK",
    //         "traceId" : "ea754a48ccdb4dd297c8f35350e0f0d9|BN20130533|02.00.106.1600|"
    //     };
    // }
    //
    // function installFakeMetadataRequest(url, mapStyle, proxy) {
    //     var expectedUrl = url + '/REST/v1/Imagery/Metadata/' + mapStyle + '?incl=ImageryProviders&key=';
    //     if (defined(proxy)) {
    //         expectedUrl = proxy.getURL(expectedUrl);
    //     }
    //
    //     loadJsonp.loadAndExecuteScript = function(url, functionName) {
    //         expect(url).toStartWith(expectedUrl);
    //
    //         setTimeout(function() {
    //             window[functionName](createFakeMetadataResponse(mapStyle));
    //         }, 1);
    //     };
    // }
    //
    // function installFakeImageRequest(expectedUrl) {
    //     loadImage.createImage = function(url, crossOrigin, deferred) {
    //         if (/^blob:/.test(url)) {
    //             // load blob url normally
    //             loadImage.defaultCreateImage(url, crossOrigin, deferred);
    //         } else {
    //             if (defined(expectedUrl)) {
    //                 expect(url).toEqual(expectedUrl);
    //             }
    //             // Just return any old image.
    //             loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
    //         }
    //     };
    //
    //     loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
    //         if (defined(expectedUrl)) {
    //             expect(url).toEqual(expectedUrl);
    //         }
    //
    //         // Just return any old image.
    //         loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
    //     };
    // }
    //
    // it('resolves readyPromise', function() {
    //     var url = 'http://fake.fake.invalid';
    //     var mapStyle = BingMapsStyle.ROAD;
    //
    //     installFakeMetadataRequest(url, mapStyle);
    //     installFakeImageRequest();
    //
    //     var provider = new BingMapsImageryProvider({
    //         url : url,
    //         mapStyle : mapStyle
    //     });
    //
    //     return provider.readyPromise.then(function(result) {
    //         expect(result).toBe(true);
    //         expect(provider.ready).toBe(true);
    //     });
    // });
    //
    // it('rejects readyPromise on error', function() {
    //     var url = 'host.invalid';
    //     var provider = new BingMapsImageryProvider({
    //         url : url
    //     });
    //
    //     return provider.readyPromise.then(function () {
    //         fail('should not resolve');
    //     }).otherwise(function (e) {
    //         expect(provider.ready).toBe(false);
    //         expect(e.message).toContain(url);
    //     });
    // });
    //
    // it('returns valid value for hasAlphaChannel', function() {
    //     var url = 'http://fake.fake.invalid';
    //     var mapStyle = BingMapsStyle.AERIAL;
    //
    //     installFakeMetadataRequest(url, mapStyle);
    //     installFakeImageRequest();
    //
    //     var provider = new BingMapsImageryProvider({
    //         url : url,
    //         mapStyle : mapStyle
    //     });
    //
    //     return pollToPromise(function() {
    //         return provider.ready;
    //     }).then(function() {
    //         expect(typeof provider.hasAlphaChannel).toBe('boolean');
    //     });
    // });
    //
    // it('can provide a root tile', function() {
    //     var url = 'http://fake.fake.invalid';
    //     var mapStyle = BingMapsStyle.ROAD;
    //
    //     installFakeMetadataRequest(url, mapStyle);
    //     installFakeImageRequest();
    //
    //     var provider = new BingMapsImageryProvider({
    //         url : url,
    //         mapStyle : mapStyle
    //     });
    //
    //     expect(provider.url).toEqual(url);
    //     expect(provider.key).toBeDefined();
    //     expect(provider.mapStyle).toEqual(mapStyle);
    //
    //     return pollToPromise(function() {
    //         return provider.ready;
    //     }).then(function() {
    //         expect(provider.tileWidth).toEqual(256);
    //         expect(provider.tileHeight).toEqual(256);
    //         expect(provider.maximumLevel).toEqual(20);
    //         expect(provider.tilingScheme).toBeInstanceOf(WebMercatorTilingScheme);
    //         expect(provider.tileDiscardPolicy).toBeInstanceOf(DiscardMissingTileImagePolicy);
    //         expect(provider.rectangle).toEqual(new WebMercatorTilingScheme().rectangle);
    //         expect(provider.credit).toBeInstanceOf(Object);
    //
    //         installFakeImageRequest('http://ecn.t0.tiles.virtualearth.net.fake.invalid/tiles/r0.jpeg?g=3031&mkt=');
    //
    //         return provider.requestImage(0, 0, 0).then(function(image) {
    //             expect(image).toBeInstanceOf(Image);
    //         });
    //     });
    // });
    //
    // it('sets correct culture in tile requests', function() {
    //     var url = 'http://fake.fake.invalid';
    //     var mapStyle = BingMapsStyle.AERIAL_WITH_LABELS;
    //
    //     installFakeMetadataRequest(url, mapStyle);
    //     installFakeImageRequest();
    //
    //     var culture = 'ja-jp';
    //
    //     var provider = new BingMapsImageryProvider({
    //         url : url,
    //         mapStyle : mapStyle,
    //         culture : culture
    //     });
    //
    //     expect(provider.culture).toEqual(culture);
    //
    //     return pollToPromise(function() {
    //         return provider.ready;
    //     }).then(function() {
    //         installFakeImageRequest('http://ecn.t0.tiles.virtualearth.net.fake.invalid/tiles/h0.jpeg?g=3031&mkt=ja-jp');
    //
    //         return provider.requestImage(0, 0, 0).then(function(image) {
    //             expect(image).toBeInstanceOf(Image);
    //         });
    //     });
    // });
    //
    // it('routes requests through a proxy if one is specified', function() {
    //     var url = 'http://foo.bar.invalid';
    //     var mapStyle = BingMapsStyle.ROAD;
    //
    //     var proxy = new DefaultProxy('/proxy/');
    //
    //     installFakeMetadataRequest(url, mapStyle, proxy);
    //     installFakeImageRequest();
    //
    //     var provider = new BingMapsImageryProvider({
    //         url : url,
    //         mapStyle : mapStyle,
    //         proxy : proxy
    //     });
    //
    //     expect(provider.url).toEqual(url);
    //     expect(provider.proxy).toEqual(proxy);
    //
    //     return pollToPromise(function() {
    //         return provider.ready;
    //     }).then(function() {
    //         installFakeImageRequest(proxy.getURL('http://ecn.t0.tiles.virtualearth.net.fake.invalid/tiles/r0.jpeg?g=3031&mkt='));
    //
    //         return provider.requestImage(0, 0, 0).then(function(image) {
    //             expect(image).toBeInstanceOf(Image);
    //         });
    //     });
    // });
    //
    // it('raises error on invalid url', function() {
    //     var url = 'host.invalid';
    //     var provider = new BingMapsImageryProvider({
    //         url : url
    //     });
    //
    //     var errorEventRaised = false;
    //     provider.errorEvent.addEventListener(function(error) {
    //         expect(error.message).toContain(url);
    //         errorEventRaised = true;
    //     });
    //
    //     return pollToPromise(function() {
    //         return provider.ready || errorEventRaised;
    //     }).then(function() {
    //         expect(provider.ready).toEqual(false);
    //         expect(errorEventRaised).toEqual(true);
    //     });
    // });
    //
    // it('raises error event when image cannot be loaded', function() {
    //     var url = 'http://foo.bar.invalid';
    //     var mapStyle = BingMapsStyle.ROAD;
    //
    //     installFakeMetadataRequest(url, mapStyle);
    //     installFakeImageRequest();
    //
    //     var provider = new BingMapsImageryProvider({
    //         url : url,
    //         mapStyle : mapStyle
    //     });
    //
    //     var layer = new ImageryLayer(provider);
    //
    //     var tries = 0;
    //     provider.errorEvent.addEventListener(function(error) {
    //         expect(error.timesRetried).toEqual(tries);
    //         ++tries;
    //         if (tries < 3) {
    //             error.retry = true;
    //         }
    //     });
    //
    //     loadImage.createImage = function(url, crossOrigin, deferred) {
    //         if (/^blob:/.test(url)) {
    //             // load blob url normally
    //             loadImage.defaultCreateImage(url, crossOrigin, deferred);
    //         } else if (tries === 2) {
    //             // Succeed after 2 tries
    //             loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
    //         } else {
    //             // fail
    //             setTimeout(function() {
    //                 deferred.reject();
    //             }, 1);
    //         }
    //     };
    //
    //     loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
    //         if (tries === 2) {
    //             // Succeed after 2 tries
    //             loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
    //         } else {
    //             // fail
    //             setTimeout(function() {
    //                 deferred.reject();
    //             }, 1);
    //         }
    //     };
    //
    //     return pollToPromise(function() {
    //         return provider.ready;
    //     }).then(function() {
    //         var imagery = new Imagery(layer, 0, 0, 0);
    //         imagery.addReference();
    //         layer._requestImagery(imagery);
    //
    //         return pollToPromise(function() {
    //             return imagery.state === ImageryState.RECEIVED;
    //         }).then(function() {
    //             expect(imagery.image).toBeInstanceOf(Image);
    //             expect(tries).toEqual(2);
    //             imagery.releaseReference();
    //         });
    //     });
    // });
});