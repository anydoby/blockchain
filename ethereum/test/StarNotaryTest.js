var SN = artifacts.require("StarNotary.sol")

contract('StarNotary', accounts => {
  const owner = accounts[0]
  const user1 = accounts[1]
  const user2 = accounts[2]
  const broker = accounts[3]
  const token = 1
  var sut

  beforeEach(async () => {
    sut = await SN.new({from: owner})
  })

  makestar = (ra, dec, mag) => {
    sut.createStar('test', ra || '121.874', dec || '245.978', mag || '6.5', 'Cent', 'my super star', token, {from:user1})
  }

  describe('Notary', () => {
      beforeEach(async () => {
        await makestar()
      })

      it('should add a new star', async () => {
        assert.equal(await sut.ownerOf(token), user1)
        assert.equal((await sut.balanceOf(user1)).toNumber(), 1)
        assert.equal(await sut.checkIfStarExist('121.874', '245.978'), true)
      })

      it('should return false if star is not registered yet', async () => {
        assert.equal(await sut.checkIfStarExist('111', '123'), false)
      })

      it('should not add a duplicate star', async () => {
        await expectThrow(sut.createStar('test2', '121.874', '245.978', '032.155', 'Virg', 'my super story2', 3, {from:user2}))
      })

      it('should allow putting stars for sale', async () => {
        await sut.putStarUpForSale(token, 100500, {from:user1})
        assert.equal(await sut.starsForSale(token), 100500)
      })

      it('should not allow putting not owned star for sale', async () => {
        await expectThrow(sut.putStarUpForSale(token, 100500, {from:user2}))
      })

      it('should fail to get info for non-existing star', async () => {
        await expectThrow(sut.tokenIdToStarInfo(23))
      })

      it('should return a valid star description for existing star', async () => {
        let star = await sut.tokenIdToStarInfo(token)
        console.log(star)
        assert.equal(star[0], 'test')
        assert.equal(star[1], 'my super star')
        assert.equal(star[2], 'ra_121.874')
        assert.equal(star[3], 'dec_245.978')
        assert.equal(star[4], 'mag_6.5')
      })

      it('should not create star with invalid right ascension', async () => {
        await expectThrow(sut.createStar('test', '', '245.978', '032.155', '', 'my super star', 123, {from:user1}))
      })
      it('should not create star with invalid declination', async () => {
        await expectThrow(sut.createStar('test', '123', '', '032.155','', 'my super star', 123, {from:user1}))
      })

      describe('user2 can buy a star that was put up for sale', () => { 
          beforeEach(async () => { 
              await sut.putStarUpForSale(token, 100500, {from: user1})
          })

          it('user2 is the owner of the star after they buy it', async () => { 
              await sut.buyStar(token, {from: user2, value: 100500, gasPrice: 0})
              assert.equal(await sut.ownerOf(token), user2)
          })

          it('user2 ether balance changed correctly', async () => { 
              let overpaidAmount = 100600
              const balanceBeforeTransaction = web3.eth.getBalance(user2)
              await sut.buyStar(token, {from: user2, value: overpaidAmount, gasPrice: 0})
              const balanceAfterTransaction = web3.eth.getBalance(user2)

              assert.equal(balanceBeforeTransaction.sub(balanceAfterTransaction).toNumber(), 100500)
          })
      })

      it('should not allow delegation if star does not belong to sender', async ()=> {
          await expectThrow(sut.approve(broker, token, {from:user2}))
      })
      it('should allow delegation if star belongs to sender', async ()=> {
          await sut.approve(broker, token, {from:user1})
          assert.equal(await sut.getApproved(token), broker)
          await sut.putStarUpForSale(token, 100500, {from: broker})
          await sut.buyStar(token, {from: user2, value: 100500, gasPrice: 0})
          assert.equal(await sut.ownerOf(token), user2)
      })
    }
  )

})

var expectThrow = async function(promise) { 
    try { 
        await promise
    } catch (error) { 
        assert.exists(error)
        return
    }

    assert.fail('Expected an error but didnt see one!')
}