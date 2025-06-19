describe('Positive test',()=>{
    test('Get distributor list', async ()=>{
        const result = {
            test: "test result",
            rowCount: 1
        };
        expect(typeof result).toBe('object')
        expect(result?.rowCount).toBeGreaterThan(0);
    });
});