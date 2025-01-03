"use client";

// import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import deplContracts from "../contracts/deployedContracts";
import { Contract, JsonRpcProvider, parseEther } from "ethers";
import type { NextPage } from "next";
import { useAccount } from "wagmi";

// ABI контракта

const CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // Адрес контракта
const RPC_URL = "http://localhost:8545"; // URL локального провайдера

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [betAmount, setBetAmount] = useState<string>("0.1"); // Значение по умолчанию
  const [predictedRate, setPredictedRate] = useState<string>("1.1"); // Предполагаемый курс
  const [contractState, setContractState] = useState<any>(null);

  // Создание провайдера
  const provider = new JsonRpcProvider(RPC_URL);

  // Функция получения контракта с подписантом
  const getContractWithSigner = async () => {
    if (!connectedAddress) {
      throw new Error("Wallet not connected");
    }
    const accounts = await provider.listAccounts();
    console.log("Available accounts:", accounts);
    const signer = await provider.getSigner(accounts[0].address);
    return new Contract(CONTRACT_ADDRESS, deplContracts[31337].YourContract.abi, signer);
  };

  // Функция размещения ставки
  const placeBet = async () => {
    try {
      const contract = await getContractWithSigner();
      const tx = await contract.placeBet(parseEther(predictedRate), {
        value: parseEther(betAmount),
      });
      await tx.wait();
      alert("Bet placed successfully!");
    } catch (error: any) {
      console.error(error);
      alert(`Failed to place bet: ${error.message}`);
    }
  };

  // Функция розыгрыша
  const settleBet = async () => {
    try {
      const contract = await getContractWithSigner();
      const tx = await contract.settleBet();
      await tx.wait();
      alert("Game finished successfully!");
    } catch (error: any) {
      console.error(error);
      alert(`Failed to settle bet: ${error.message}`);
    }
  };

  // Получение состояния контракта
  const fetchContractState = async () => {
    try {
      const contract = await getContractWithSigner();
      const state = await contract.getContractState();
      setContractState(state);
    } catch (error: any) {
      console.error(error);
      alert(`Failed to fetch contract state: ${error.message}`);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">Recurring Currency Bet</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
            <p className="my-2 font-medium">Connected Address:</p>
            <p>{connectedAddress || "Not connected"}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center">
          <h2 className="text-xl font-bold mb-4">Place a Bet</h2>
          <form
            onSubmit={e => {
              e.preventDefault();
              placeBet();
            }}
            className="space-y-4 flex flex-col items-center w-full max-w-xs"
          >
            <div className="w-full">
              <label className="block text-sm font-medium">Bet Amount (ETH):</label>
              <input
                type="text"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium">Predicted Rate (USD/EUR):</label>
              <input
                type="text"
                value={predictedRate}
                onChange={e => setPredictedRate(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Place Bet
            </button>
          </form>

          <form
            onSubmit={e => {
              e.preventDefault();
              settleBet();
            }}
            className="space-y-4 flex flex-col items-center w-full max-w-xs mt-6"
          >
            <button type="submit" className="btn btn-primary w-full">
              Settle Bet
            </button>
          </form>
        </div>

        <div className="mt-8 w-full max-w-lg text-center">
          <h2 className="text-xl font-bold mb-4">Contract State</h2>
          <div className="flex flex-col items-center">
            <button onClick={fetchContractState} className="btn btn-secondary w-48 mb-4">
              Fetch State
            </button>
            {contractState && (
              <pre className="p-4 bg-gray-100 rounded-lg w-full max-w-full whitespace-pre-wrap break-words">
                {JSON.stringify(contractState, (key, value) => value.toString(), 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
