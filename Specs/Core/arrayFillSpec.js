/*global defineSuite*/
defineSuite([
        'Core/arrayFill'
    ], function(
        arrayFill) {

    var array;

    beforeEach(function() {
        array = [0, 0, 0, 0];
    });
    
    fit('will fill an entire array', function() {
        arrayFill(array, 1);
        expect(array).toEqual([1, 1, 1, 1]);
    });
    
    fit('will fill a portion of an array', function() {
        arrayFill(array, 1, 1, 3);
        expect(array).toEqual([0, 1, 1, 0]);
    });
    
    fit('will wrap around negative values', function() {
        arrayFill(array, 1, -2, -1);
        expect(array).toEqual([0, 0, 1, 0]);
    });

    fit('will fill until end if no end is provided', function() {
        arrayFill(array, 1, 1);
        expect(array).toEqual([0, 1, 1, 1]);
    });
    
    fit('will throw an error if no array is provided', function() {
        expect(function() {
            arrayFill(undefined, 1, 0, 1);
        }).toThrowDeveloperError('Array is required.');
    });

    it('will throw an error if no array is provided', function() {
        expect(function() {
            arrayFill(array, undefined, 0, 1);
        }).toThrowDeveloperError('Value is required.');
    });

    it('will throw an error if given an invalid start index', function() {
        expect(function() {
            arrayFill(array, 1, array, 1);
        }).toThrowDeveloperError('Start must be a valid index.');
    });
    
    it('will throw an error if given an invalid end index', function() {
        expect(function() {
            arrayFill(array, 1, 1, array);
        }).toThrowDeveloperError('End must be a valid index.');
    });

});