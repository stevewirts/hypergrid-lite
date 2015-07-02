var assoc = require('../src/javascript/main').assoc;

var chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));

var assert = chai.assert

describe('function', function() {
    describe('assoc', function() {
        var tstObj_empty = {},
        	tstObj_prePopulatedObj = {
        		aa: {
                	some : 'other thing'
                }
        	}, 
        	tstObj_prePopulatedArr = {
                a: {
                    b: {
                        c: [55]
                    }
                }
            }, 
            tstObj_finalAfterEmpty = {
                a: {
                    b: {
                        c: {
                            ok: 42
                        }
                    }
                }
            },
            tstObj_finalAfterEmptyArr = {
                a: {
                    b: {
                        c: [42]
                    }
                }
            },
            tstObj_finalAfterPrepop = {
                a: {
                    b: {
                        c: {
                            ok: 42
                        }
                    }
                },
                aa: {
                	some : 'other thing'
                }
            }, 
            tstObj_finalAfterPrepopArr = {
                a: {
                    b: {
                        c: [55, 42]
                    }
                }
            };

        it('should add the keys if not there', function() {
            assert.shallowDeepEqual(tstObj_finalAfterEmpty, assoc(tstObj_empty, ['{a', '{b', '{c'], ['ok', 42]));
        });
        it('should create (if not there) and push to array', function() {
            assert.shallowDeepEqual(tstObj_finalAfterEmptyArr, assoc(tstObj_empty, ['{a', '{b', '{c'], 42));
        });


        it('should add the keys if not there, preserving values', function() {
            assert.shallowDeepEqual(tstObj_finalAfterPrepop, assoc(tstObj_prePopulatedObj, ['{a', '{b', '{c'], ['ok', 42]));
        })
        it('should push to array, preserving values', function() {
            assert.shallowDeepEqual(tstObj_finalAfterPrepopArr, assoc(tstObj_prePopulatedArr, ['{a', '{b', '{c'], 42));
        })
    })
})


