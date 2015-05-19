import dpkt, json, socket

def pcap_to_json(fp):

    pcap = dpkt.pcap.Reader(fp)

    tcps = [
    	{
    		'ts' : ts,
    		'src' : socket.inet_ntoa(ip_hdr.src),
    		'sport' : ip_hdr.data.sport,
    		'dst' : socket.inet_ntoa(ip_hdr.dst),
    		'dport' : ip_hdr.data.dport,
    		'datalen' : len(ip_hdr.data.data),
    		'ipv' : ip_hdr.v,
    		'seq' : ip_hdr.data.seq,
    		'ack' : ip_hdr.data.ack,
    		'win' : ip_hdr.data.win,
    		'flags' : {
    					'SYN': True if ip_hdr.data.flags & dpkt.tcp.TH_SYN else False,
    					'ACK': True if ip_hdr.data.flags & dpkt.tcp.TH_ACK else False,
    					'RST': True if ip_hdr.data.flags & dpkt.tcp.TH_RST else False,
    					'PUSH': True if ip_hdr.data.flags & dpkt.tcp.TH_PUSH else False,
    					'FIN': True if ip_hdr.data.flags & dpkt.tcp.TH_FIN else False
    				}
    	}
    	for ts, ip_hdr
    	in [(ts, dpkt.ethernet.Ethernet(buf).data) for ts, buf in list(pcap)]
    	if ip_hdr.p == 6
    ]

    return json.dumps(tcps)

if __name__ == '__main__':
	with open('../github.pcap', 'rb') as fp:
		print pcap_to_json(fp)