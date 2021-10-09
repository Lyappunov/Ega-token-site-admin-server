const Web3 = require("web3") ;
const ERC20 = require("./ERC20.json");


class Price{
	constructor() {

		this.egaAddress = '0xd93c90070162512b7c74b151fd2c6a58031d1cc9';
		this.bnbAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
		this.lpAddress = '0x18a9a030d2C052b54146179978B91eDF7414206a';   
    }

	async getPrice(){
		const provider = new Web3.providers.HttpProvider("https://bsc-dataseed.binance.org/");
		const web3 = new Web3(provider);
		const egaToken = new web3.eth.Contract(ERC20, this.egaAddress);
		const bnbToken = new web3.eth.Contract(ERC20, this.bnbAddress);

		return {
			egaBalance : await egaToken.methods.balanceOf(this.lpAddress).call(),
			bnbBalance : await bnbToken.methods.balanceOf(this.lpAddress).call()

		}
	}	
}
exports.Price = Price