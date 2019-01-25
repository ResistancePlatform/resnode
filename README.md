# Resistance Masternodes

## Configure A Resistance Masternode

### Setup a VPS on AWS

**Note**: For this document I will be assuming that you are using AWS. These instructions may not work for other VPS providers.

First configure a VPS on AWS. Here are the recommended parameters:

1. OS: Ubuntu Server 18.04 LTS (HVM), SSD Volume Type, 64-bit (x86)
2. Instance Types (At least t2.medium)
	- At least 2 vCPUS
	- At least 4 GiB Memory
3. Network: Pick a network with Internet axis and a public IP
4. Disk: 64 GiB
5. Security Group: Create a new Security group with
	- SSH (TCP 22) Enabled for your ip
	- HTTP (TCP 80) Enabled for anyone
	- HTTPS (TCP 443) Enabled for anyone
	- TCP 18133 (Testnet)
	- TCP 8133 (Mainnet)
	- Custom ICMP Rule - IPv4 - Echo Request - N/A - 0.0.0.0/0
	- Custom ICMP Rule - IPv4 - Echo Request - N/A - ::/0


### Clone, Compile, Run, and Download Resistance Blockchain

Once you have the AWS instance up and running, you will need to download the Resistance Blockchain.

1. SSH into your VPS
2. Update your node

```bash
sudo apt update
sudo apt upgrade
```

3. Set up SSH keys with Resistance Repo (won't be necessary once we go public). [Instructions](https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/#platform-linux)
4. Clone the Resistance Core repo

```bash
cd ~ 
git clone git@github.com:ResistancePlatform/resistance-core.git
```

5. Compile Resistance

```bash
sudo apt install build-essential automake libtool pkg-config libcurl4-openssl-dev curl
```

```bash
cd ~/resistance-core
./resutil/build.sh -j2
```

6. This will take around 30 minutes so be patient. Proceed once the compilation succeeds.
7. Create the resistance config file

```bash
sudo apt install pwgen
```

```bash
mkdir ~/.resistance
cat <<EOF > ~/.resistance/resistance.conf
rpcuser=$(pwgen -s 32 1)
rpcpassword=$(pwgen -s 64 1)
rpcport=18132
port=18133
rpcallowip=127.0.0.1
rpcworkqueue=512
server=1
daemon=1
listen=1
txindex=1
logtimestamps=1
### testnet config
testnet=1
EOF
```

8. Download the Resistance Parameters

```
./resutil/fetch-params.sh
```

9. Start up the Resistance daemon

```bash
./src/resistanced -daemon
```

10. Wait for the blockchain to sync. Check if headers and blocks match to know when syncing is finished

```bash
watch -n 30 ./src/resistance-cli getblockchaininfo
```

### Stake and Challenge Balance

1. In your local wallet (**not the one in AWS**), generate a new address and transfer 10,000.05 RES to this address. 

*Note*:This balance will not be stored on your AWS instance, it will be safe in sound in your local wallet. You can even put it in a Ledger Wallet. Just make sure that you have 10,000 RES in an address that you don't plan on moving around, and make a note of this address. We will call this `stake_addr` from now on.

2. On the remote AWS instance generate an r-address (`r_addr`) and two z-addresses (`z_addr1` and `z_addr21`). Make note of these addresses.

```bash
# generate r_addr
export r_addr=$(./src/resistance-cli getnewaddress)

# generate z_addr1
export z_addr1=$(./src/resistance-cli z_getnewaddress)

# generate z_addr2
export z_addr2=$(./src/resistance-cli z_getnewaddress)

# print out the addresses

echo $r_addr; echo $z_addr1; echo $z_addr2
```

3. In your **local wallet (not AWS)**, send 0.05 RES from `stake_addr` to `r_addr`
4. On your **AWS Instance**, run the following command until you see the `transparent: 0.0499` appear

```bash
watch -n 30 ./src/resistance-cli z_gettotalbalance
```

5. Once the balance appears there, run the following:

```bash
./src/resistance-cli z_sendmany $r_addr '[{"address": "'$z_addr1'", "amount":0.0249},{"address":"'$z_addr2'", "amount":0.0249}]'
```

6. Wait for the balance to transfer to the z-addresses (`private: 0.0498`)

```bash
watch -n 30 ./src/resistance-cli z_gettotalbalance
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
11. Get your IP address from your AWS instance by running: `curl https://httpbin.org/ip`, copy the ip that is printed out
12. Enter the following: `Name: leave this empty`, `Type: A`, `TTL: 3600`, `Target: ip from your machine`
13. Click save changes
14. After a few minutes ping the domain you created and make sure it's accessible.

### Add IP to your Config

1. Add an entry into your resistance config

```bash
ip=IP_YOU_USED_IN_DNS_STEP
echo "externalip=$ip" >> ~/.resistance/resistance.conf
```


### Running the Resistance Node Tracker

1. Clone the ResNode repository

```bash
cd ~
git clone git@github.com:ResistancePlatform/resnode.git
```

2. Install Node.js (via nvm)

```bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
source ~/.bashrc
```

3. Install Node Version

```bash
nvm install stable
```

4. Install Packages

```bash
npm install
```

5. Run the Resistance Node Setup

```bash
node setup.js
```

6. When prompted, enter your `stk_addr` that you have 10,000 RES in
7. Enter an email address for alerts
8. Enter your Full hostname (FQDN) that you registered earlier
9. Click enter when prompted about IP
10. Click enter when promped about Region
11. Click enter when prompted about Category
12. You should now see: ***Configuration for testnet node saved. Setup complete!***

### Start up your node

You are now ready to start up your masternode! Let's install PM2 so that the process handling is easier.

```
npm install -g pm2
```

```
pm2 app.js
pm2 save
```

You can see the output by running

```
pm2 logs app
```

You can kill it at anytime by running

```
pm2 stop app
```

### Viewing your Connectivity


You can see a chart of your connectivity by going to:

https://resnodetracker.tk/?uuid=YOUR_UUID

You can find your UUID in `config/config.json` under `node_id`

