const VERSION_POS = 14;
const VARIANT_POS = 19;
let canCalculateDatetime = true;

if (typeof BigInt === 'undefined') {
    console.log('BigInt is unavailable');
    canCalculateDatetime = false;
}

function showInfo(version, shouldShow) {
    let infoElements = document.getElementsByClassName('info');
    for (let element of infoElements) {
        element.style.display = 'none';
    }

    // Move the version/variant info to the correct info div.
    let infoId = `uuid${version}_info`;
    let versionDiv = document.getElementById('version_info');
    let infoDiv = document.getElementById(infoId);
    if (version !== 0 && infoDiv !== null) {
        infoDiv.appendChild(versionDiv);
    }

    if (shouldShow) {
        infoDiv.style.display = 'block';
    }
}

function substituteAll(className, str) {
    let elements = document.getElementsByClassName(className);
    for (let element of elements) {
        element.textContent = str;
    }
}

function colorPortion(id, color, value, startIndex, endIndex) {
    let start = value.substring(0, startIndex);
    let middle = value.substring(startIndex, endIndex);
    let end = value.substring(endIndex);
    let content = `${start}<span style=color:${color}>${middle}</span>${end}`;

    document.getElementById(id).innerHTML = content;
}

function getVersion(uuid) {
    let version = -1;

    if (isNilUUID(uuid)) {
        // Use zero to represent the nil uuid.
        version = 0;
    } else {
        let versionChar = uuid[VERSION_POS];
        version = parseInt(versionChar, 16);
        if (version >= 1 && version <= 5) {
            return version;
        }
    }

    return version;
}

function getVariant(uuid) {
    let variantChar = uuid[VARIANT_POS];
    let variant = parseInt(variantChar, 16);

    if (variant <= 7) { // 0..7
        return 0;
    } else if (variant <= 11) { // 8..b
        return 1;
    } else if (variant <= 13) { // c..d
        return 2;
    } else { // e..f
        return 3;
    }
}

function isNilUUID(uuid) {
    return uuid === '00000000-0000-0000-0000-000000000000';
}

function handleVersion1(uuid) {
    nodeId = getNodeId(uuid);
    firstOctet = parseInt(nodeId[1], 16); // Least significant bits of the first octet.

    let macAddressSpan = document.getElementById('mac_addr_desc');
    let nodeIdSpan = document.getElementById('node_id_desc');

    if ((firstOctet & 0x01) == 0) {
        // This is a MAC address, not a node ID.
        macAddressSpan.style.display = 'inline';
        nodeIdSpan.style.display = 'none';
    } else {
        macAddressSpan.style.display = 'none';
        nodeIdSpan.style.display = 'inline';
    }

	let date = 'undefined';
	if (canCalculateDatetime) {
		date = getTimestamp(uuid);

		// Disable the unsupported browser tooltip.
		let tooltips = document.getElementsByClassName('tooltip');
		for (let element of tooltips) {
			element.style.borderBottom = 'none';
		}

		let tooltipTexts = document.getElementsByClassName('tooltiptext');
		for (let element of tooltipTexts) {
			element.style.display = 'none';
		}
	} else {
		// Enable the unsupported browser tooltip.
		let tooltips = document.getElementsByClassName('tooltip');
		for (let element of tooltips) {
			element.style.borderBottom = '1px dashed black';
		}

		let tooltipTexts = document.getElementsByClassName('tooltiptext');
		for (let element of tooltipTexts) {
			element.style.display = 'inline';
		}

	}

	document.getElementById('time').innerText = date;
}

function getNodeId(uuid) {
    return uuid.substring(24, 36);
}

function getMacAddress(nodeId) {
    let bytes = nodeId.match(/..?/g);
    return bytes.join(':');
}

function pad(value) {
    if (value < 10) {
        value = '0' + value;
    }

    return value;
}

function formatDate(date) {
    let y  = pad(date.getFullYear());
    let mo = pad(date.getMonth() + 1);
    let d  = pad(date.getDate());
    let h  = pad(date.getHours());
    let mi = pad(date.getMinutes());
    let s  = pad(date.getSeconds());

    return `${y}-${mo}-${d} ${h}:${mi}:${s}`
}

function getTimestamp(uuid) {
    let timeInt = BigInt(0);
    let matches = uuid.match('^(........)-(....)-.(...)-....-............$');
    let rawTimestamp = matches[3] + matches[2] + matches[1];
    for (let timeChar of rawTimestamp) {
        let val = parseInt(timeChar, 16);
        timeInt <<= BigInt(4);
        timeInt |= BigInt(val);
    }

    // 122,192,928,000,000,000 is the number of 100-ns intervals between the
    // UUID1 epoch (1582-10-15, the date of the Gregorian calendar reform) and
    // the Unix epoch (1970-01-01).
    let rfcDelta = BigInt(122192928000000000);
    let millis = Number((timeInt - rfcDelta) / BigInt(10000));
    let date = new Date(millis);
    return formatDate(date);
}

function processUUID(e) {
    let shouldShowInfo = false;
    let version = null;

    if ($(e.target).is(':valid')) {
        shouldShowInfo = true;
        let uuid = document.getElementById('uuid').value.trim().toUpperCase();
        let nodeId = getNodeId(uuid);
        let variant = getVariant(uuid);
        version = getVersion(uuid);
        let mac_addr = getMacAddress(nodeId);


        substituteAll('full_uuid', uuid);
        substituteAll('variant', variant);
        substituteAll('version', version);
        substituteAll('mac_addr', mac_addr);
        document.getElementById('mac_lookup').href = 'https://aruljohn.com/mac/' + nodeId;

        colorPortion('version_uuid_highlight', 'red', uuid, VERSION_POS, VERSION_POS + 1);
        colorPortion('variant_uuid_highlight', 'red', uuid, VARIANT_POS, VARIANT_POS + 1);

        if (version == 1) {
            handleVersion1(uuid);
        }

		// Update url.
        history.replaceState({}, 'foo', '/' + uuid.toLowerCase());
    }

    showInfo(version, shouldShowInfo);
}

function init() {
    let inputElement = document.getElementById('uuid');
    inputElement.addEventListener('input', processUUID);

    let url_uuid = window.location.href.match(/[\w-]*$/g)[0];

    if (url_uuid) {
        let inputElement = document.getElementById('uuid');
        inputElement.value = url_uuid;
        inputElement.dispatchEvent(new Event('input'));
    }
}

window.onload = init;
