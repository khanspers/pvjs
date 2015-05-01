var _ = require('lodash');
// TODO use remote, not local repo
//var gpml2pvjson = require('../../../gpml2pvjson-js/index.js');
var gpml2pvjson = require('gpml2pvjson');
var Utils = require('./../utils.js');

module.exports = function renderer() {

  // Render engines are sorted in order of preference -
  // viewMethod with lower index will be used if more than one is returned.
  var renderersMap = {
    gpml:   ['svg'], // Could add canvas support
    pvjson:   ['svg'], // Could add canvas support
    // biopax: ['svg'], // Not supported. Could add canvas support
    // pdf:    ['pdf'], // Not supported. This would be future. we might use pdf.js
    // or we could just try using an embed or object tag.
    png:    ['img'],
    jpg:    ['img'],
    jpeg:   ['img'],
    jpe:    ['img'],
    jif:    ['img'],
    jfif:   ['img'],
    jfi:    ['img'],
    gif:    ['img'],
    ico:    ['img'],
    bmp:    ['img'],
    dib:    ['img']
  };
  // Assumption that all browsers we care about support the HTML img tag
  var supportedRenderers = ['img'];

  // Check for Modernizr support
  if (!!window.Modernizr && window.Modernizr.inlinesvg) {
    supportedRenderers.push('svg');
  }

  /**
   * Check if renderer supports rendering a given file type
   *
   * @param  {object} sourceData
   * @return {boolean}
   */
  function canRender(sourceData) {
    return !!getRendererEngineName(sourceData.fileType);
  }

  /**
   * Returns renderer engine name
   *
   * @param  {string} fileType
   * @return {string|bool}          engine name or false
   */
  function getRendererEngineName(fileType) {
    // If fileType unknown
    if (renderersMap[fileType] === undefined) {
      return false;
    }

    var rendererEngines = renderersMap[fileType];

    // Check if there is a match between necessary and supported renderes
    for (var i = 0; i < rendererEngines.length ; i++) {
      if (supportedRenderers.indexOf(rendererEngines[i]) !== -1) {
        return rendererEngines[i];
      }
    }

    // If nothing found
    return false;
  }

  /**
   * Check if data should be preloaded and parsed
   *
   * @param  {object} sourceData sourceData object
   * @return {boolean}
   */
  function needDataConverted(sourceData) {
    var rendererEngine = getRendererEngineName(sourceData.fileType);

    if (rendererEngine === 'svg') {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Ask renderer to remove everything what is rendered
   * Useful when rendering a specific type or source failed and next one will be tried
   *
   * @param  {Object} pvjs Instace Object
   * @return {boolean} success state
   */
  function destroyRender(pvjs, sourceData) {
    // TODO
    return true;
  }

  /**
   * Loads data and converts to pvjson data format
   * @param {object} pvjs instance
   * @param {Function} callback
   */
  function loadAndConvert(pvjs, callback) {
    var sourceData = pvjs.sourceData;
    var pathwayMetadata = {};
    pathwayMetadata.version = sourceData.version;

    // Check for uri
    if (!pvjs.sourceData.uri) {
      return callback('No uri specified', {});
    }

    var resource = sourceData.resource || '';
    if (!_.isEmpty(resource)) {
      pathwayMetadata['@id'] = resource;
    }
    var identifierMatch = resource.match(/http:\/\/identifiers.org\/wikipathways\/(WP\d+)/) ||
        sourceData.uri.match(/(WP\d+)/);
    pathwayMetadata.identifier = identifierMatch ? identifierMatch[1] : null;
    if (!pathwayMetadata['@id'] && !!pathwayMetadata.identifier) {
      pathwayMetadata['@id'] = 'http://identifiers.org/wikipathways/' + pathwayMetadata.identifier;
    }

    pathwayMetadata.dbName = sourceData.db || 'wikipathways';

    if (pvjs.sourceData.fileType === 'gpml') {
      // Load xml
      Utils.loadXmlFromUri(pvjs.sourceData.uri, function(xml) {
        // we don't want the original to change, so we clone it.
        pvjs.sourceData.original = xml.clone();
        window.myxml = xml;
        gpml2pvjson.toPvjson(xml, pathwayMetadata, function(err, pvjson) {
          var pvjsonString = JSON.stringify(pvjson, null, '  ');
          return callback(err, pvjson);
        });
      });
    } else if (pvjs.sourceData.fileType === 'pvjson') {
      // TODO use hyperquest and possibly JSONStream here instead of d3
      d3.json(pvjs.sourceData.uri, function(err, pvjson) {
        if (err) {
          console.warn(err);
          return callback(err);
        }
        return callback(err, pvjson);
      });
    } else {
      return callback('Cannot get pvjson from the specified input.', {});
    }
  }

  return {
    canRender: canRender,
    loadAndConvert: loadAndConvert,
    needDataConverted: needDataConverted,
    destroyRender: destroyRender
  };
};
