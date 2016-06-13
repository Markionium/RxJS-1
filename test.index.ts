declare const require: any;

const requireAll = function (requireContext) {
    requireContext.keys().map(requireContext);
};

require('mocha');
require('spec/helpers/testScheduler-ui');

//import all code base first, html templates as well
requireAll(require.context('src/', true, /^((?!-[tT]est).)*$/));


//import all test cases
requireAll(require.context('spec/', true, /-[sS]pec\.js$/));