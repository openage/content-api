'use strict';
var response = require('../helpers/response');
var forms = require('forms');
var fields = forms.fields;
var validators = forms.validators;


var inputErrors = function (form) {
    var errors = {},
        field;

    for (field in form.fields) {
        if (form.fields[field].error) {
            errors[field] = form.fields[field].error;
        }
    }

    return errors;
};

exports.validations = function (form) {
    return function (model) {
        return {
            isValid: function (callback) {
                form.handle(model, {
                    error: function (resultForm) {
                        callback(inputErrors(resultForm));
                    },
                    success: function (form) {
                        callback(null, form);
                    }
                });
            }
        };
    };
};


