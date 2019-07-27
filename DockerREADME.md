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
4. Disk: 64 GiB
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
5. Before running a Resistance Masternode with Docker you need to initialize the Resistance core blockchain. To start with that, run Resistance core with Docker `docker run --rm -d -v ~/resuser:/home/resuser -p 18132:18132 -p 18133:18133 resistance-core:latest`. This will mount a directory in your home directory named `resuser`, this directory will be used for persistent storage for Resistance core e.g. the blockchain database.
6. Now, wait for the blockchain to sync by running this command `watch -n30 docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance-cli getblockchaininfo`.  When the headers and blocks match, that will indicate that syncing is complete.

### Stake and Challenge Balance

1. In your local wallet (**not the one in AWS**), generate a new address and transfer 10,000.05 RES to this address. 

*Note*:This balance will not be stored on your AWS instance, it will be safe in sound in your local wallet. You can even put it in a Ledger Wallet. Just make sure that you have 10,000 RES in an address that you don't plan on moving around, and make a note of this address. We will call this `stake_addr` from now on.

2. On the remote AWS instance generate an r-address (`r_addr`) and two z-addresses (`z_addr1` and `z_addr21`). Make note of these addresses.
Use this command to generate an r-address:
`docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli getnewaddress`
Run this command twice to generate two z-addresses:
`docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_getnewaddress`
`docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_getnewaddress`
3. In your **local wallet (not AWS)**, send 0.05 RES from `stake_addr` to `r_addr`
4. On your **AWS Instance**, run the following command until you see the `transparent: 0.0499` appear
`watch -n 30 docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_gettotalbalance`
5. Once the balance appears there, run the following:
`docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_sendmany $r_addr '[{"address": "'$z_addr1'", "amount":0.0249},{"address":"'$z_addr2'", "amount":0.0249}]'`
6. Next, wait for the balance to transfer to the z-addresses (`private: 0.0498`)
`docker exec -it -u resuser $(docker ps | grep resistance-core | awk '{print $1}') ./resistance/resistance-cli z_gettotalbalance`

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

1. Add an entry into your resistance config. Note that you may need to run this command via `sudo` as your user account might not have permissions to the Masternode data directory.
```bash
sudo echo "externalip=YOUR_AWS_INSTANCE_PUBLIC_IP" >> ~/resuser/.resistance/resistance.conf
```

### Running the Resistance Node Tracker

1. First run resnode from Docker. . . use ~/resuser for persistence
2. Run the Resistance Node Setup
```docker exec . . . node setup.js
```
6. When prompted, enter your `stk_addr` that you have 10,000 RES in
7. Enter an email address for alerts	
8. Enter your Full hostname (FQDN) that you registered earlier
9. Click enter when prompted about IP
10. Click enter when promped about Region
11. Click enter when prompted about Category
12. You should now see: ***Configuration for testnet node saved. Setup complete!***

todo:
Command to add external ip, fail if not provided
run setup interactively
rebuild rescore image
test up in AWS with a real DNS name!
update doc accordingly

### Start up your node
You are now ready to start up your masternode!
1. First stop the Resistance core and resnode containers, if they are still running. . .
2. Now start them both up via docker-compose. . .
3. 

### Viewing your Connectivity


You can see a chart of your connectivity by going to:

https://resnodetracker.tk/?uuid=YOUR_UUID

You can find your UUID in `config/config.json` under `node_id`

