var _ = require('underscore');

class Conti {
    constructor(start,end,key,fn){
        this.start = start;
        this.end = end;
        this.key = key;
        this.fn = fn;
    }

    isActive(data){
        return data[this.key] >= this.start && data[this.key] < this.end;
    }

    process(data, trans_vals){
        var delta = this.end - this.start;
        var clamped_pct = (data[this.key] - this.start) / delta;
        return this.fn(clamped_pct, trans_vals);
    }

    run(data,trans_vals){
        if(typeof(trans_vals) === "undefined"){
            var trans_vals = {};
        }

        if(this.isActive(data)){
            return this.process(data, trans_vals);
        } else {
            return trans_vals;
        }
    }

    abut(next_end,fn){
        var new_conti = new Conti(this.end, next_end, this.key, fn)
        new_conti.isActive = _.bind(function(data){
            var left_isActive = this.isActive(data),
                this_isActive = data[this.key] >= new_conti.start && data[this.key] < new_conti.end;
            return left_isActive || this_isActive;
        },this);

        new_conti.run = _.bind(function(data, trans_vals){
            if(this.isActive(data)){
                return this.run(data, trans_vals);
            } else if(new_conti.isActive(data)){
                return new_conti.process(data, trans_vals);
            } else {
                return trans_vals;
            }
        },this);

        return new_conti;
    }
}

module.exports = Conti;
