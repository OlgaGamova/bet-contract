//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract YourContract {
    // Структура для представления ставки
    struct Bet {
        address player;
        uint256 amount;
        int256 predictedRate;
    }

    // Данные о ставках
    Bet public bet1;
    Bet public bet2;
    bool public isBet1Placed;
    bool public isBet2Placed;

    // Время дедлайна и вычисления результата
    uint256 public bettingDeadline;
    uint256 public resultTime;

    // Оракул курса валют
    AggregatorV3Interface internal priceFeed;

    // События
    event BetPlaced(address indexed player, uint256 amount, int256 predictedRate);
    event BetsCleared();
    event WinnerDeclared(address indexed winner, uint256 amount);
    event BetsRefunded();

    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    // Функция для размещения ставки
    function placeBet(int256 predictedRate) external payable {
        require(msg.value > 0, "Bet amount must be greater than zero");

        // Проверяем, нужно ли сбросить старые данные
        if (block.timestamp > bettingDeadline && (isBet1Placed || isBet2Placed)) {
            clearBets();
        }

        // Устанавливаем дедлайн и время расчёта, если это первая ставка в новом раунде
        if (!isBet1Placed && !isBet2Placed) {
            uint256 currentTime = block.timestamp;
            bettingDeadline = getEndOfDay(currentTime); // Конец текущего дня
            resultTime = bettingDeadline + 9 hours; // Время результата - 9 утра следующего дня
        }

        // Размещение ставок
        if (!isBet1Placed) {
            bet1 = Bet(msg.sender, msg.value, predictedRate);
            isBet1Placed = true;
        } else if (!isBet2Placed) {
            require(msg.value == bet1.amount, "Bet amount must match the first bet");
            bet2 = Bet(msg.sender, msg.value, predictedRate);
            isBet2Placed = true;
        } else {
            revert("Both bets are already placed");
        }

        emit BetPlaced(msg.sender, msg.value, predictedRate);
    }

    // Функция для определения победителя и выплаты средств
    function settleBet() external {
        require(block.timestamp >= resultTime, "Result time not reached");
        require(isBet1Placed, "No bets placed");

        if (!isBet2Placed) {
            // Если второй участник не сделал ставку
            uint256 refundAmount = bet1.amount - tx.gasprice;
            payable(bet1.player).transfer(refundAmount);
            emit BetsRefunded();
            return;
        }

        // Получаем текущий курс валют
        (, int256 actualRate, , , ) = priceFeed.latestRoundData();

        // Расчёт разницы между прогнозами и фактическим курсом
        int256 diff1 = abs(bet1.predictedRate - actualRate);
        int256 diff2 = abs(bet2.predictedRate - actualRate);

        if (diff1 < diff2) {
            // Первый участник побеждает
            uint256 prize = bet1.amount + bet2.amount;
            payable(bet1.player).transfer(prize);
            
            //emit WinnerDeclared(bet1.player, prize);
        } else if (diff2 < diff1) {
            // Второй участник побеждает
            uint256 prize = bet1.amount + bet2.amount;
            payable(bet2.player).transfer(prize);
            emit WinnerDeclared(bet2.player, prize);
        } else {
            // Ничья - возвращаем ставки
            uint256 refundAmount1 = bet1.amount - tx.gasprice;
            uint256 refundAmount2 = bet2.amount - tx.gasprice;
            payable(bet1.player).transfer(refundAmount1);
            payable(bet2.player).transfer(refundAmount2);
            emit BetsRefunded();
        }

        // Очищаем данные после расчёта результата
        clearBets();
    }

    // Функция для чтения состояния контракта
    function getContractState() public view returns (
        address player1, uint256 amount1, int256 predictedRate1,
        address player2, uint256 amount2, int256 predictedRate2,
        uint256 currentBettingDeadline,
        uint256 currentResultTime,
        bool isBet1Active,
        bool isBet2Active
    ) {
        player1 = isBet1Placed ? bet1.player : address(0);
        amount1 = isBet1Placed ? bet1.amount : 0;
        predictedRate1 = isBet1Placed ? bet1.predictedRate : int256(0);

        player2 = isBet2Placed ? bet2.player : address(0);
        amount2 = isBet2Placed ? bet2.amount : 0;
        predictedRate2 = isBet2Placed ? bet2.predictedRate : int256(0);

        currentBettingDeadline = bettingDeadline;
        currentResultTime = resultTime;
        isBet1Active = isBet1Placed;
        isBet2Active = isBet2Placed;
    }

    // Вспомогательная функция для очистки данных о ставках
    function clearBets() internal {
        delete bet1;
        delete bet2;
        isBet1Placed = false;
        isBet2Placed = false;
        bettingDeadline = 0;
        resultTime = 0;
        emit BetsCleared();
    }

    // Функция для вычисления конца текущего дня в UTC
    function getEndOfDay(uint256 timestamp) private pure returns (uint256) {
        uint256 dayStart = timestamp - (timestamp % 1 days);
        return dayStart + 1 days - 1;
    }

    // Вспомогательная функция для вычисления модуля числа
    function abs(int256 x) private pure returns (int256) {
        return x >= 0 ? x : -x;
    }
}
