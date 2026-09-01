process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import handler from '../api/coach-ai';

async function runTests() {
  console.log('=== TEST 1: MAP QUERY (Four Lakes) ===');
  const mockReq1: any = {
    method: 'POST',
    body: {
      message: 'Come giocare su Four Lakes con i Francesi?',
      history: [],
      userNickname: 'Marco'
    }
  };

  let jsonResult1: any = null;
  const mockRes1: any = {
    setHeader: () => {},
    status: (code: number) => ({
      json: (data: any) => {
        console.log('Status code:', code);
        jsonResult1 = data;
      }
    })
  };

  await handler(mockReq1, mockRes1);
  console.log('Result 1 has reply:', !!jsonResult1?.reply);
  console.log('Result 1 tacticalCard:', jsonResult1?.tacticalCard);

  console.log('\n=== TEST 2: MATCHUP QUERY ===');
  const mockReq2: any = {
    method: 'POST',
    body: {
      message: 'Chi vince tra Inglesi e Francesi a rank Conqueror?',
      history: [],
      userNickname: 'Marco'
    }
  };

  let jsonResult2: any = null;
  const mockRes2: any = {
    setHeader: () => {},
    status: (code: number) => ({
      json: (data: any) => {
        console.log('Status code:', code);
        jsonResult2 = data;
      }
    })
  };

  await handler(mockReq2, mockRes2);
  console.log('Result 2 has reply:', !!jsonResult2?.reply);
  console.log('Result 2 reply snippet:', jsonResult2?.reply?.substring(0, 180));
  console.log('Result 2 tacticalCard:', jsonResult2?.tacticalCard);
}

runTests().catch(console.error);
