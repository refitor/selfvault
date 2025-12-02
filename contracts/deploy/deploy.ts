import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy } = hre.deployments;

    const deployedSETH = await deploy("SETH", {
        from: deployer,
        log: true,
    });

    console.log(`SETH contract: `, deployedSETH.address);
};
export default func;
func.id = "deploy_SETH"; // id required to prevent reexecution
func.tags = ["SETH"];
