import React, { useEffect, useState } from "react";
import { ethers, utils } from "ethers";
import './App.css';
import abi from "./utils/WavePortal.json";
import { Rings } from "react-loader-spinner";
import Dialog from "@material-ui/core/Dialog";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import Button from "@material-ui/core/Button";

export default function App() {

  const [isLoading, setIsLoading] = useState(false);

  const [currentAccount, setCurrentAccount] = useState("");

  const [currentTxn, setCurrentTxn] = useState("");

  const [allWaves, setAllWaves] = useState([]);

  const [inputMsg, setInputMsg] = useState("");

  const [openDialog, setOpenDialog] = useState(false);

  const [prize, setPrize] = useState("");

  const contractAddress = "0xbA2717Ba32410F651ECE74A75B12F4918FC03Cd4";
  const contractABI = abi.abi;

  /*
   * Método para consultar todos os H5 do contrato
   */
  const getAllWaves = async () => {
    const { ethereum } = window;
    
    try {
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

        /*
         * Chama o método getAllWaves do seu contrato inteligente
         */
        const waves = await wavePortalContract.getAllWaves();

        /*
         * Apenas precisamos do endereço, data/horário, e mensagem na nossa tela, 
         * então vamos selecioná-los.
         */
        let wavesCleaned = [];
        waves.forEach(wave => {
          wavesCleaned.push({
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message
          });
        });

        /*
         * Armazenando os dados
         */
        setAllWaves(wavesCleaned);

        console.log("All waves", wavesCleaned);

      } else {
        console.log("Objeto Ethereum não existe!")
      }
    } catch (error) {
      console.log(error);
    }
  }

  const checkIfWalletIsConnected = async () => {    
    try {
      const { ethereum } = window;

      if (!ethereum) {
        console.log("Garanta que possua a Metamask instalada!");
        return;
      } else {
        console.log("Temos o objeto ethereum", ethereum);
      }

      const accounts = await ethereum.request({ method: "eth_accounts" });

      if (accounts.length !== 0) {
        const account = accounts[0];
        
        setCurrentAccount(account);
        console.log("Encontrada a conta autorizada:", account);

        getAllWaves();
      } else {
        console.log("Nenhuma conta autorizada foi encontrada")
      }
    } catch (error) {
      console.log(error);
    }
  }

  const wave = async () => {
      try {
        setIsLoading(true)
        
        const { ethereum } = window;

        if (ethereum) {
          const provider = new ethers.providers.Web3Provider(ethereum);
          const signer = provider.getSigner();
          const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

          let count = await wavePortalContract.getTotalWaves();
          console.log("Recuperado o número de Hi5...", count.toNumber());

          /*
          * Executar o Hi5 a partir do contrato inteligente
          */
          const waveTxn = await wavePortalContract.wave(inputMsg, { gasLimit: 300000 });
          setCurrentTxn(waveTxn.hash);
          console.log("Minerando...", waveTxn.hash);

          await waveTxn.wait();
          console.log("Minerado -- ", waveTxn.hash);

          count = await wavePortalContract.getTotalWaves();
          console.log("Total de High Fives recuperados...", count.toNumber());
        } else {
          console.log("Objeto Ethereum não encontrado!");
        }
        setIsLoading(false)
        setCurrentTxn(null);
        setInputMsg("");
      } catch (error) {
        console.log(error);
        setIsLoading(false);
        setCurrentTxn(null);
      }
  }

  /**
  * método para conectar a carteira
  */
  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("MetaMask não encontrada!");
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      console.log("Conectado", accounts[0]);
      setCurrentAccount(accounts[0]);
      getAllWaves();
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  /**
   * Escuta por eventos emitidos!
   */
  useEffect(() => {
    let wavePortalContract;

    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves(prevState => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message,
        },
      ]);
    };

    const onPrizeAwarded = (from, prize) => {
      let amount = utils.formatEther(prize.toNumber());
      console.log("Awarded!", from, currentAccount, amount);
      
      if (from.toLowerCase() == currentAccount.toLowerCase()) {
        setPrize(amount);
        setOpenDialog(true);
      }
    };

    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
      wavePortalContract.on("NewWave", onNewWave);
      wavePortalContract.on("Awarded", onPrizeAwarded);
      
    }

    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
        wavePortalContract.off("Awarded", onPrizeAwarded);
      }
    };
  }, []);
  
  return (
    <div className="mainContainer">

      <div className="dataContainer">
        <div className="header">
          { isLoading ? '👋 ' : '🖐️ ' }
          What's up!?
        </div>

        <div className="bio">
          This is an example on how to interact with a smart contract on the Ethereum Network. Connect your wallet to send a high five! <br />Are you feeling Lucky?! Try it out and you could be awarded with a prize in Sepolia Ether!

        </div>

        {/*
        * Se não existir currentAccount, apresente este botão
        */}
        {!currentAccount ? (
          <button className="waveButton" onClick={connectWallet}>
            Connect wallet
          </button>
        ) : (
        <div style={{ display: "content" }}>
            
            <input
              placeholder="Write a message to send a High Five!"
              className="inputMessage"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
            />
          
            <button className="waveButton" onClick={isLoading ? null : wave} disabled={!inputMsg || isLoading}>
              Send a highfive { isLoading ? '👋 ' : '🖐️ ' }
            </button>
              
            <Rings
              visible={isLoading}
              color= "#2a71d0"
              wrapperClass="loading"
            />
          
          </div>
        )}

        {isLoading && currentTxn ? <label className="transactionHash">Transaction Hash: {currentTxn}</label> : null}

        {allWaves.map((wave, index) => {
          return (
            <div key={index} className="allWavesBox">
              <div>Endereço: {wave.address}</div>
              <div>Data/Horário: {wave.timestamp.toString()}</div>
              <div>Mensagem: {wave.message}</div>
            </div>)
        })}

        <Dialog open={openDialog} onClose={(e) => setOpenDialog(false)}>
          <DialogTitle>{"Congratulations! 🌟"}</DialogTitle>
          <DialogContent>
              <DialogContentText>
                  You are Lucky!! You just won a prize of {prize} ETH!
              </DialogContentText>
          </DialogContent>
          <DialogActions>
              <Button onClick={(e) => setOpenDialog(false)}
                  color="primary" autoFocus>
                  Close
              </Button>
          </DialogActions>
        </Dialog>
        
      </div>
    </div>
  );
}
