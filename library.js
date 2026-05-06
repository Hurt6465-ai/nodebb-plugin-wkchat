'use strict';

const plugin = {};

plugin.init = async function init(params) {
  const winston = require.main.require('winston');
  winston.info('[nodebb-plugin-wkchat] WKChat conversation list plugin loaded');
};

module.exports = plugin;
