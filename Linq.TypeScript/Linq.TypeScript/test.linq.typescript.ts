namespace Test.Linq
{
    function Do()
    {
        var source = linq.generate(i => i).take(1000 * 100);

        var count = 0;
        source.where(a => a >= 5).select(a => a + 1)
            .forEach(a => count++);

        var result = source.where(a => a >= 5).select(a => a + 1).toArray();
        console.log(result);

        var dict = linq(result).toDictionary(a => "key" + a.toString(), a => a);
        result = source.union(linq(result)).toArray();
        console.log(result);

        var join = linq(source).join(linq(result), l => l, r => r, (l, r) => l + r).toArray();
        result = linq.generate(i => i).take(10).toArray();
        console.log(result);

        source = linq.generate(i => i).take(1000 * 100);
        var min = source.min();
        var max = source.max();
        var sum = source.sum();
    }

    Do();
} 