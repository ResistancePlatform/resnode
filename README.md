# Resistance Masternodes

## Configure A Resistance Masternode with Docker

### Setup an EC2 instance on AWS

**Note**: For this document we will assume that you are using AWS. These instructions may need to be adjusted to work with other cloud providers.

First configure an EC2 instance on AWS. Here are the recommended parameters:

1. OS: Ubuntu Server 18.04 LTS (HVM), SSD Volume Type, 64-bit (x86)
2. Instance Types (At least t2.medium)
	- At least 2 vCPUS
	- At least 4 GiB Memory
3. Network: Pick a network with Internet access and a public IP
4. Disk: 250 GiB
5. Security Group: Create a new Security group with
	- SSH (TCP 22) Enabled for your ip
	- HTTP (TCP 80) Enabled for anyone
	- HTTPS (TCP 443) Enabled for anyone
	- TCP 18133 (Testnet)
	- TCP 8133 (Mainnet)
	- Custom ICMP Rule - IPv4 - Echo Request - N/A - 0.0.0.0/0
	- Custom ICMP Rule - IPv4 - Echo Request - N/A - ::/0

Note: Ensure that you select **Echo Request** in the ICMP configuration. Echo Reply will not work.

### Install Docker and docker-compose

Once you have the AWS instance up and running, you need to install and configure Docker and docker-compose.

1. SSH into your instance and run:
```bash
sudo apt update
sudo apt upgrade
```
2. Next install Docker, see the documentation here: https://docs.docker.com/install/linux/docker-ce/ubuntu/#install-docker-ce-1
3. We recommend that you configure Docker so that you can run commands as a non-root user, see the instructions in the Docker install guide.
4. Install docker-compose, see the documentation here: https://docs.docker.com/compose/install/
5. Before running a Resistance Masternode with Docker you need to initialize the Resistance core blockchain. To start with that, run Resistance core with Docker 

```
docker run --rm -d -v ~/resuser:/home/resuser -p 18132:18132 -p 18133:18133 resistanceio/resistance-core:latest
```

This will mount a directory in your home directory named `resuser`, this directory will be used for persistent storage for Resistance core e.g. the blockchain database.

6. Now, wait for the blockchain to sync by running this command 

```
watch -n30 docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli getblockchaininfo
```

When the headers and blocks match, that will indicate that syncing is complete.

### Stake and Challenge Balance

1. In your local wallet (**not the one in AWS**), generate a new transparent address and transfer 10,000.5 RES to this address. 

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

3. In your **local wallet (not AWS)**, send 0.5 RES from `stake_addr` to `r_addr`. **You MUST transfer funds from stk_addr to r_addr in this step. This proves that you own the stk_addr and prevents other users from pretending that they own your address. If this step is not done, your masternode will not receive rewards.**
4. On your **AWS Instance**, run the following command until you see the `transparent: 0.499` appear
```
watch -n 30 docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_gettotalbalance
```
5. Once the balance appears there, run the following:
```
docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_sendmany $r_addr '[{"address": "'$z_addr1'", "amount":0.2499},{"address":"'$z_addr2'", "amount":0.2499}]'
```
6. Next, wait for the balance to transfer to the z-addresses (`private: 0.4998`)
```
docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_gettotalbalance
```
7. Now stop your resistance-core container:
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
10. Click "Manage Free DNS"
11. Get your public IP address from your AWS instance by running: `curl https://httpbin.org/ip`, copy the ip that is printed out
12. Enter the following: `Name: leave this empty`, `Type: A`, `TTL: 3600`, `Target: ip from your machine`
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
2. Using docker-compose, we will start up resistance-core and resnode together: 

```
docker-compose up -d
```

### Viewing your Connectivity

You can see a chart of your connectivity by going to:

https://resnodetracker.tk/?uuid=YOUR_UUID

You can find your UUID in `config/config.json` under `node_id`

