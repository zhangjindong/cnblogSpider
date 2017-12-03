var obj = {
    name: "我",
    add: function(a) {
        for (let ar in arguments)
            console.log(this.name + arguments[ar])
    }
};
obj.add("a")
obj.add.apply(null, ["a", "b", "c"])