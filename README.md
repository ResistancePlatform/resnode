# Resistance Masternodes

## Configure A Resistance Masternode with Docker

**PLEASE FOLLOW EVERY STEP OF THIS GUIDE CLOSELY: If you skip a step, it will not work.**

### Setup an EC2 instance on AWS

**Note**: For this document we will assume that you are using AWS. These instructions may need to be adjusted to work with other cloud providers.

First configure an EC2 instance on AWS. Here are the recommended parameters:

1. OS: Ubuntu Server 18.04 LTS (HVM), SSD Volume Type, 64-bit (x86)
2. Instance Types (At least t2.medium)
	- At least 2 vCPUS
	- At least 4 GiB Memory
3. Network: Pick a network with Internet access and a public IP
4. Disk: 400 GiB
5. Security Group: Create a new Security group with
	- SSH (TCP 22) Enabled for your ip
	- HTTP (TCP 80) Enabled for anyone
	- HTTPS (TCP 443) Enabled for anyone
	- Custom TCP 8133 (Resistance Mainnet)
	- Custom ICMP Rule - IPv4 - Echo Request - N/A - Anywhere
  
Note: Ensure that you select **Echo Request** in the ICMP configuration. Echo Reply will not work.

### Add Elastic IP

Create an Elastic IP for the instance you created. 

1. Click on "Elastic IPs" under "Network & Security" in the left scrollbar. 
2. Click allocate new address button.
3. Select "Amazon Pool", then click "Allocate"
4. Make note of the IP it displays
5. Scroll down to the IP that was created, select it, and click "Actions > Associate Address"
6. Under "Instance" select the instance you created above
7. For "Private IP" select the only option available
8. Click "Associate"


### Install Docker and docker-compose

Once you have the AWS instance up and running, you need to install and configure Docker and docker-compose.

1. SSH into your instance and run:
```bash
sudo apt update
sudo apt upgrade
```
2. Next install Docker, see the documentation here: https://docs.docker.com/install/linux/docker-ce/ubuntu/#install-docker-ce-1

```
sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg-agent \
    software-properties-common
```

```
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
```

```
sudo add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"
```

```
sudo apt-get update
```

```
sudo apt-get install docker-ce docker-ce-cli containerd.io
```

Now we want to make sure that we don't have to run docker as root:

```
sudo groupadd docker
sudo usermod -aG docker $USER
newgrp docker 
sudo systemctl restart docker
```
Then to make sure docker installed correctly and can run without root run:

```
docker run hello-world
```

3. We recommend that you configure Docker so that you can run commands as a non-root user, see the instructions in the Docker install guide.
4. Install docker-compose, see the documentation here: https://docs.docker.com/compose/install/

```
sudo curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
```

```
sudo chmod +x /usr/local/bin/docker-compose
```

Then to make sure docker-compose installed correctly run:

```
docker-compose --version
```

5. Before running a Resistance Masternode with Docker you need to initialize the Resistance core blockchain. To start with that run Resistance core with Docker 

```
docker run --rm -d -v ~/resuser:/home/resuser -p 8132:8132 -p 8133:8133 resistanceio/resistance-core:latest
```

This will mount a directory in your home directory named `resuser`, this directory will be used for persistent storage for Resistance core e.g. the blockchain database.

6. Now, wait for the blockchain to sync by running this command repeatedly (will take at least 10 min)

```
docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli getblockchaininfo
```

When the headers and blocks match, that will indicate that syncing is complete.

### Stake and Challenge Balance

1. In your local wallet (**not the one in AWS**), generate a new transparent address. 
    - Transfer 10,001 RES to this address. 
    - Transfer 0.51 RES to this same address.
    - Transfer 0.1 RES to this same address
    
**Make sure to make 3 transactions (one with 10,001, one with 0.51 RES, and one with 0.1 RES). Don't just combine them into one. It will make your life easier**.

*Note*:This balance will not be stored on your AWS instance, it will be safe in sound in your local wallet. You can even put it in a Ledger Wallet. Just make sure that you have 10,000 RES in an address that you don't plan on moving around, and make a note of this address. 

**DO NOT USE THIS ADDRESS FOR ANYTHING ELSE BUT HOLDING YOUR MASTERNODE FUNDS AND SETTING UP YOUR MASTERNODES**. If you use this address to send funds to someone else you may potentially allow them to receive credit for your masternode. We will call this masternode staking address `stake_addr` from now on.

2. On the remote AWS instance generate an r-address (`r_addr`) and two z-addresses (`z_addr1` and `z_addr21`) using the commands below. Make note of these addresses.

Use this command to generate an r-address:
```
docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli getnewaddress
```

Run this command twice to generate two z-addresses:
```
docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_getnewaddress
```

```
docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_getnewaddress
```

3. In your **local wallet (not AWS)**, send 0.5 RES from `stake_addr` to `r_addr`.
4. On your **AWS Instance**, run the following command repeatedly until you see the `transparent: 0.499` appear
```
docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_gettotalbalance
```
5. Once the balance appears there, run the following (replacing `R_ADDR`, `Z_ADDR_1`, and `Z_ADDR2` with the r_addr and z addresses you generated above in step 2):
```
docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_sendmany R_ADDR '[{"address": "Z_ADDR_1", "amount":0.2499},{"address":"Z_ADDR2", "amount":0.2499}]'
```
6. Next, wait for the balance to transfer to the z-addresses (`private: 0.4998`)
```
docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_gettotalbalance
```
7. Now we need to add some information to the resistance config file inside the container. Replace YOUR_IP_ADDR with the Elastic IP address of your masternode and run:

```
docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') bash -c "echo externalip=YOUR_IP_ADDR >> ~/.resistance/resistance.conf"
```

8. Now stop your resistance-core container:
```
docker stop $(docker ps | grep resistance-core | awk '{print $1}')
```

### Create a domain name

You need to create a domain name for your site. You can do this using freenom.tk

1. Go to: https://www.freenom.com/en/index.html?lang=en
2. Type in the domain name you want (for example: `mynode.tk`)
3. Click "Get it now"
4. Click "Checkout"
5. In the "Period" dropdown, change it to 12 months (should still be free)
6. Click continue
7. Enter your email address and finish the registration process
8. Log into your freenom account and go to: https://my.freenom.com/clientarea.php?action=domains
9. Click "Manage Domain" next to the domain you just created
10. Click "Manage Freenom DNS"
11. Get your public IP address from your AWS instance by running: `curl https://httpbin.org/ip`, copy the ip that is printed out
12. Enter the following: `Name: leave this empty`, `Type: A`, `TTL: 600`, `Target: ip from your machine`
13. Click save changes
14. After a few minutes ping the domain you created and make sure it's accessible.

### Add IP to your Config

Next, you will need to add some additional entries to your resnode config file. Note that your resnode container will start successfully until this has been done.

1. Start up the resnode container via 
```
docker run -d -v ~/resuser:/home/resuser resistanceio/resnode:latest
```
2. Run the init script via 
```
docker exec -u resuser -w /home/resuser/resnode -it $(docker ps | grep resistanceio/resnode | awk '{print $1}') ./init.sh
``` 
At the prompts, enter your nodes FQDN (fully qualified domain name) which you set up in the last step, then enter your stake address and lastly your email address. The command/container will exit when you're done. Note this will update the `~/resuser/resnode/config/config.json` file which you can modify directly in the future if needed. Also note that you may need sudo/root permissions to do so as the permissions will be tied to the resuser account which runs in the resistance-core and resnode containers.

### Running the Resistance Node Tracker

1. Now, you are ready to run your resnode and resistance-core servers together. First make sure that both Resistance containers are stopped by running these commands:

```
docker stop $(docker ps | grep resistanceio/resnode | awk '{print $1}')
```

```
docker stop $(docker ps | grep resistanceio/resistance-core | awk '{print $1}')
```

If you see a message that "docker stop" requires at least 1 argument" then your container is no longer running.

3. Using docker-compose, we will grab the config file and start up resistance-core and resnode together: 

```
cd ~
wget -O docker-compose.yml https://raw.githubusercontent.com/ResistancePlatform/resnode/master/docker-compose.yml
docker-compose up -d
```
4. Once it starts up, run the following:

```
docker-compose logs -f
```
After a few seconds, you should see text that looks like (copy the R_PROVING_ADDR value): 

```
Node t_address (not for stake)=R_PROVING_ADDR
```
4. On your local instance (where you are storing you `stk_addr`) create a transaction and send 0.01 RES from your `stk_addr` to the `R_PROVING_ADDR` that you just copied. This will prove that you own the `stk_addr`.  **You MUST transfer funds from stk_addr to `R_PROVING_ADDR` in this step. This proves that you own the stk_addr and prevents other users from pretending that they own your address. If this step is not done, your masternode will not receive rewards.**

**Note: When you create a transaction using Resistance, change is returned to your wallet but is not necessarily returned to the same address you used to send the funds. By the time you finish this guide, please check to make sure your balance in stk_address is at least 10,000.** You can do this easily by looking on our block explorer at https://blockexplorer.resistance.io and entering your `stk_address`. If it shows a balance of 0, it's likely because the change was delivered to another address in your wallet. You will need to make another transfer and ensure that `stk_address`is the address that has 10,000 in it.

### Viewing your Connectivity

You can get information about your ping, stake amount, and challenge response here:

https://resnode.resistance.io/connectivity?uuid=YOUR_UUID

**Please note that in order to receive Masternode payouts your ping and challenge must be 1 and your stake balance must be over 10,000. Your node will be checked at random intervals, and you must achieve these metrics at least 90% of the time.**

You can see a chart of your connectivity by going to:

https://resnode.resistance.io/?uuid=YOUR_UUID

You can find your UUID in `config/config.json` under `node_id`

### Restarting Docker Containers

If you are having any issues, a good place to start is to restart your docker containers:

```
cd ~
docker-compose down
docker-compose up -d
```

